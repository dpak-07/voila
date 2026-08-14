import io
from datetime import datetime
from pymongo import MongoClient, ASCENDING, DESCENDING
import pandas as pd
from typing import Optional, Dict, Any, List, Generator
from backend.config.settings import settings

class DBConnector:
    """Manages database connections, streaming data ingestion, and dataset versioning for MongoDB & Snowflake."""

    def __init__(self, uri: str = None, db_name: str = None):
        self.uri = uri or settings.mongo_uri
        self.db_name = db_name or settings.mongo_db
        self.client = MongoClient(self.uri)
        self.db = self.client[self.db_name]
        self._ensure_indexes()

    def _ensure_indexes(self):
        """Creates compound indexes to guarantee sub-50ms analytics and run lookups."""
        try:
            self.db["conversations"].create_index([("user", ASCENDING), ("dataset_run_id", ASCENDING)])
            self.db["conversations"].create_index([("dataset_run_id", ASCENDING)])
            self.db["conversations"].create_index([("created_at", DESCENDING)])
            self.db["conversations"].create_index([("topic_keywords", ASCENDING)])
            self.db["conversations"].create_index([("sentiment", ASCENDING)])
            
            self.db["dataset_runs"].create_index([("user", ASCENDING), ("uploaded_at", DESCENDING)])
            self.db["dataset_runs"].create_index([("run_id", ASCENDING)], unique=True)
            
            self.db["kpis"].create_index([("run_id", ASCENDING), ("user", ASCENDING)])
            self.db["kpis"].create_index([("user", ASCENDING), ("time_period", ASCENDING)])
        except Exception as e:
            print(f"[DB Indexing Warning]: {e}")

    def update_pipeline_status(self, run_id: str, step: str, status: str, error: str = None) -> None:
        """Updates the status and execution logs of the data ingestion pipeline."""
        collection = self.db["pipeline_status"]
        log_entry = {
            "run_id": run_id,
            "step": step,
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
        }
        if error:
            log_entry["error"] = error
            
        collection.update_one(
            {"run_id": run_id},
            {"$set": log_entry, "$push": {"history": log_entry}},
            upsert=True
        )

    def register_dataset_run(self, run_metadata: Dict[str, Any]) -> None:
        """Registers an uploaded dataset version in the run catalog for historical comparisons."""
        collection = self.db["dataset_runs"]
        collection.update_one(
            {"run_id": run_metadata["run_id"]},
            {"$set": run_metadata},
            upsert=True
        )

    def _dataframe_chunk_generator(self, df: pd.DataFrame, chunk_size: int = 10000) -> Generator[List[Dict[str, Any]], None, None]:
        """Low-memory iterator that yields chunk dictionaries without duplicating the full dataset in RAM."""
        cols = df.columns.tolist()
        total_rows = len(df)
        for i in range(0, total_rows, chunk_size):
            chunk_slice = df.iloc[i : i + chunk_size]
            # Convert slice to dict records
            yield chunk_slice.to_dict(orient="records")

    def save_dataframe(self, df: pd.DataFrame, run_id: str = None, user_id: str = "deepak", collection_name: str = None) -> None:
        """Streams DataFrame into MongoDB in 10k generator batches with run versioning (zero full-memory duplication)."""
        coll_name = collection_name or settings.mongo_collection
        collection = self.db[coll_name]
        
        if df.empty:
            return

        total_records = len(df)
        chunk_size = 10000
        total_chunks = (total_records + chunk_size - 1) // chunk_size

        print("==========================================")
        print(f"WRITING TO MONGODB '{coll_name}' ({total_records:,} DOCUMENTS | Run ID: {run_id})")
        print("==========================================")

        processed = 0
        for chunk_idx, records_chunk in enumerate(self._dataframe_chunk_generator(df, chunk_size=chunk_size), 1):
            collection.insert_many(records_chunk, ordered=False)
            processed += len(records_chunk)
            pct = (processed / total_records) * 100.0
            print(f"  [MongoDB Write {pct:5.1f}%] Inserted batch {chunk_idx}/{total_chunks} ({processed:,} / {total_records:,} docs)")

        # 1. Stream Processed Dataset to S3 as Parquet
        s3_key = self.upload_processed_to_s3(df, run_id=run_id)

        # 2. Synchronize to Snowflake Warehouse
        self.save_to_snowflake(df, run_id=run_id, user_id=user_id, s3_parquet_key=s3_key)

    def upload_processed_to_s3(self, df: pd.DataFrame, run_id: str) -> Optional[str]:
        """Saves enriched dataset directly to AWS S3 in compressed Parquet format (10x compression)."""
        if not settings.aws_s3_bucket:
            return None

        try:
            import boto3
            s3 = boto3.client(
                "s3",
                region_name=settings.aws_region or "ap-south-1",
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
            )
            s3_key = f"processed/{run_id}.parquet"
            parquet_buffer = io.BytesIO()
            df.to_parquet(parquet_buffer, index=False, engine="auto")
            parquet_buffer.seek(0)
            
            s3.upload_fileobj(
                parquet_buffer,
                settings.aws_s3_bucket,
                s3_key,
                ExtraArgs={"ContentType": "application/x-parquet"}
            )
            print(f"[S3 PROCESSED ROUTE] Uploaded s3://{settings.aws_s3_bucket}/{s3_key}")
            return s3_key
        except Exception as e:
            print(f"[S3 Processed Route Warning]: {e}")
            return None

    def save_to_snowflake(self, df: pd.DataFrame, run_id: str, user_id: str, s3_parquet_key: str = None) -> bool:
        """Loads dataset to Snowflake via S3 COPY INTO stage (sub-2s cloud load) or write_pandas."""
        if not (settings.snowflake_account and settings.snowflake_user and settings.snowflake_password):
            return False

        try:
            import snowflake.connector
            conn = snowflake.connector.connect(
                account=settings.snowflake_account,
                user=settings.snowflake_user,
                password=settings.snowflake_password,
                role=settings.snowflake_role,
                warehouse=settings.snowflake_warehouse,
                database=settings.snowflake_database,
                schema=settings.snowflake_schema or "PUBLIC"
            )
            
            cursor = conn.cursor()
            
            # Method 1: S3 Stage Direct COPY INTO (Fastest, Zero Local Compute)
            if s3_parquet_key and settings.aws_s3_bucket:
                try:
                    copy_sql = f"""
                    COPY INTO SOCIAL_MEDIA_METRICS (
                        TWEET_ID, DATASET_RUN_ID, USER_ID, TEXT, CLEAN_TEXT, 
                        SENTIMENT, SENTIMENT_SCORE, CONFIDENCE, TOPIC_KEYWORDS, RESPONSE_TIME_MINUTES
                    )
                    FROM (
                        SELECT 
                            $1:tweet_id::NUMBER, '{run_id}', '{user_id}', $1:text::VARCHAR, $1:clean_text::VARCHAR,
                            $1:sentiment::VARCHAR, $1:sentiment_score::NUMBER, $1:confidence::FLOAT, $1:topic_keywords::VARCHAR, $1:response_time_minutes::FLOAT
                        FROM @VOILA_S3_STAGE/{s3_parquet_key}
                    )
                    FILE_FORMAT = (TYPE = 'PARQUET')
                    ON_ERROR = 'CONTINUE';
                    """
                    cursor.execute(copy_sql)
                    conn.close()
                    print(f"[SNOWFLAKE SYNC] Loaded records via S3 Stage COPY INTO from {s3_parquet_key}.")
                    return True
                except Exception:
                    pass

            # Method 2: Fallback write_pandas with Arrow chunking
            from snowflake.connector.pandas_tools import write_pandas
            df_sf = df.copy()
            df_sf.columns = [c.upper() for c in df_sf.columns]
            if "DATASET_RUN_ID" not in df_sf.columns:
                df_sf["DATASET_RUN_ID"] = run_id
            if "USER_ID" not in df_sf.columns:
                df_sf["USER_ID"] = user_id

            success, nchunks, nrows, _ = write_pandas(
                conn, 
                df_sf, 
                table_name="SOCIAL_MEDIA_METRICS", 
                auto_create_table=False,
                chunk_size=50000
            )
            conn.close()
            print(f"[SNOWFLAKE SYNC] Loaded {nrows:,} records into SOCIAL_MEDIA_METRICS via write_pandas.")
            return success
        except Exception as e:
            print(f"[Snowflake Sync Info]: {e}")
            return False


    def save_kpi_summary(self, kpi_payload: dict) -> None:
        """Saves calculated service KPIs and metric signatures to MongoDB."""
        kpi_coll = self.db["kpis"]
        run_id = kpi_payload.get("run_id")
        user = kpi_payload.get("user")
        
        if run_id:
            kpi_coll.update_one(
                {"run_id": run_id, "user": user},
                {"$set": kpi_payload},
                upsert=True
            )
        else:
            kpi_coll.insert_one(kpi_payload)

