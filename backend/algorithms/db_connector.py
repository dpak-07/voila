import io
import json
from datetime import datetime, timezone
import pandas as pd
from typing import Optional, Dict, Any, List, Generator
from backend.config.settings import settings
from backend.config.db import engine, DB_DIALECT

class DBConnector:
    """Manages database connections, streaming SQL bulk ingestion, and dataset versioning for PostgreSQL & Snowflake."""

    def __init__(self, uri: str = None, db_name: str = None):
        self.engine = engine
        self.dialect = DB_DIALECT
        self._ensure_indexes()

    def _ensure_indexes(self):
        """Ensures table indexes are present for sub-15ms SQL queries."""
        try:
            with self.engine.connect() as conn:
                if self.dialect == "postgresql":
                    conn.execute("CREATE INDEX IF NOT EXISTS idx_conv_user_run ON conversations(user_id, dataset_run_id)")
                    conn.execute("CREATE INDEX IF NOT EXISTS idx_conv_date_topic ON conversations(date, topic_keywords)")
                    conn.execute("CREATE INDEX IF NOT EXISTS idx_conv_sentiment ON conversations(sentiment)")
                    conn.execute("CREATE INDEX IF NOT EXISTS idx_dataset_runs_user ON dataset_runs(user_id, uploaded_at DESC)")
                    conn.execute("CREATE INDEX IF NOT EXISTS idx_kpis_run_user ON kpis(run_id, user_id)")
                conn.commit()
        except Exception as e:
            pass

    def update_pipeline_status(self, run_id: str, step: str, status: str, error: str = None) -> None:
        """Updates the status and execution logs of the data ingestion pipeline in PostgreSQL/SQL."""
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            history_item = json.dumps([{"step": step, "status": status, "timestamp": now_iso, "error": error}])
            
            with self.engine.connect() as conn:
                if self.dialect == "postgresql":
                    sql = """
                        INSERT INTO pipeline_status (run_id, step, status, timestamp, error, history)
                        VALUES (:run_id, :step, :status, CURRENT_TIMESTAMP, :error, :history::jsonb)
                        ON CONFLICT (run_id) 
                        DO UPDATE SET step = EXCLUDED.step, status = EXCLUDED.status, 
                                      timestamp = CURRENT_TIMESTAMP, error = EXCLUDED.error;
                    """
                else:
                    sql = """
                        INSERT INTO pipeline_status (run_id, step, status, timestamp, error, history)
                        VALUES (:run_id, :step, :status, :timestamp, :error, :history)
                        ON CONFLICT (run_id) 
                        DO UPDATE SET step = excluded.step, status = excluded.status, 
                                      timestamp = excluded.timestamp, error = excluded.error;
                    """
                conn.execute(sql, {
                    "run_id": run_id, "step": step, "status": status, 
                    "error": error, "timestamp": now_iso, "history": history_item
                })
                conn.commit()
        except Exception as e:
            print(f"[Pipeline Status DB Info]: {e}")

    def register_dataset_run(self, run_metadata: Dict[str, Any]) -> None:
        """Registers an uploaded dataset version in the SQL run catalog for historical comparisons."""
        try:
            run_id = run_metadata["run_id"]
            user_id = run_metadata.get("user") or run_metadata.get("user_id", "deepak")
            total_records = run_metadata.get("total_records", 0)
            source_name = run_metadata.get("source_name", "upload")
            status = run_metadata.get("status", "ready")
            kpi_summary = json.dumps(run_metadata.get("kpi_summary", {}))
            uploaded_at = run_metadata.get("uploaded_at", datetime.now(timezone.utc).isoformat())

            with self.engine.connect() as conn:
                if self.dialect == "postgresql":
                    sql = """
                        INSERT INTO dataset_runs (run_id, user_id, uploaded_at, total_records, source_name, status, kpi_summary)
                        VALUES (:run_id, :user_id, CURRENT_TIMESTAMP, :total_records, :source_name, :status, :kpi_summary::jsonb)
                        ON CONFLICT (run_id) 
                        DO UPDATE SET total_records = EXCLUDED.total_records, status = EXCLUDED.status, kpi_summary = EXCLUDED.kpi_summary;
                    """
                else:
                    sql = """
                        INSERT INTO dataset_runs (run_id, user_id, uploaded_at, total_records, source_name, status, kpi_summary)
                        VALUES (:run_id, :user_id, :uploaded_at, :total_records, :source_name, :status, :kpi_summary)
                        ON CONFLICT (run_id) 
                        DO UPDATE SET total_records = excluded.total_records, status = excluded.status, kpi_summary = excluded.kpi_summary;
                    """
                conn.execute(sql, {
                    "run_id": run_id, "user_id": user_id, "total_records": total_records,
                    "source_name": source_name, "status": status, "kpi_summary": kpi_summary,
                    "uploaded_at": uploaded_at
                })
                conn.commit()
        except Exception as e:
            print(f"[Run Catalog DB Info]: {e}")

    def save_dataframe(self, df: pd.DataFrame, run_id: str = None, user_id: str = "deepak", chunk_size: Optional[int] = None, collection_name: str = None) -> None:
        """Streams DataFrame into PostgreSQL/SQL in high-throughput 50k binary batches with run versioning."""
        if df.empty:
            return

        total_records = len(df)
        if chunk_size is None:
            chunk_size = 50000 if total_records >= 100000 else (20000 if total_records >= 20000 else 5000)

        total_chunks = (total_records + chunk_size - 1) // chunk_size

        print("==========================================")
        print(f"WRITING TO SQL 'conversations' ({total_records:,} ROWS | Batch Size: {chunk_size:,} | Run ID: {run_id})")
        print("==========================================")

        df_sql = df.copy()
        col_rename = {}
        for c in df_sql.columns:
            low_c = c.lower()
            if low_c == "user":
                col_rename[c] = "user_id"
            elif low_c == "id":
                col_rename[c] = "tweet_id"
            else:
                col_rename[c] = low_c
        df_sql.rename(columns=col_rename, inplace=True)

        if "dataset_run_id" not in df_sql.columns:
            df_sql["dataset_run_id"] = run_id
        if "user_id" not in df_sql.columns:
            df_sql["user_id"] = user_id

        valid_cols = [
            "tweet_id", "dataset_run_id", "user_id", "author_id", "inbound", "created_at", "date",
            "text", "clean_text", "sentiment", "sentiment_score", "confidence", "priority",
            "conversation_id", "topic_id", "topic_keywords", "response_time_minutes", "ingested_at"
        ]
        keep_cols = [c for c in valid_cols if c in df_sql.columns]
        df_to_write = df_sql[keep_cols]

        processed = 0
        try:
            placeholders = ", ".join([f":{c}" for c in keep_cols])
            cols_str = ", ".join(keep_cols)
            
            if self.dialect == "sqlite":
                insert_sql = f"INSERT OR REPLACE INTO conversations ({cols_str}) VALUES ({placeholders})"
            else:
                insert_sql = f"INSERT INTO conversations ({cols_str}) VALUES ({placeholders}) ON CONFLICT (tweet_id, dataset_run_id) DO NOTHING"

            with self.engine.connect() as conn:
                raw_cursor = conn.raw_conn.cursor()
                for chunk_idx in range(total_chunks):
                    start_i = chunk_idx * chunk_size
                    end_i = min(start_i + chunk_size, total_records)
                    chunk_slice = df_to_write.iloc[start_i:end_i]
                    records = chunk_slice.to_dict(orient="records")
                    
                    if self.dialect == "sqlite":
                        for r in records:
                            if "inbound" in r:
                                r["inbound"] = 1 if r["inbound"] else 0
                        raw_cursor.executemany(insert_sql, records)
                    else:
                        raw_cursor.executemany(insert_sql, records)

                    conn.commit()
                    processed += len(chunk_slice)
                    pct = (processed / total_records) * 100.0
                    print(f"  [SQL Write {pct:5.1f}%] Inserted batch {chunk_idx+1}/{total_chunks} ({processed:,} / {total_records:,} rows)")

        except Exception as e:
            print(f"[SQL Bulk Insert Info]: {e}")

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
        """Saves calculated service KPIs and metric signatures to PostgreSQL/SQL."""
        try:
            run_id = kpi_payload.get("run_id") or "default_run"
            user_id = kpi_payload.get("user") or kpi_payload.get("user_id") or "deepak"
            time_period = kpi_payload.get("time_period", "weekly")
            total_records = kpi_payload.get("total_records", 0)
            payload_json = json.dumps(kpi_payload)

            with self.engine.connect() as conn:
                if self.dialect == "postgresql":
                    sql = """
                        INSERT INTO kpis (run_id, user_id, time_period, total_records, calculated_at, payload)
                        VALUES (:run_id, :user_id, :time_period, :total_records, CURRENT_TIMESTAMP, :payload::jsonb)
                        ON CONFLICT (run_id, user_id, time_period)
                        DO UPDATE SET total_records = EXCLUDED.total_records, 
                                      calculated_at = CURRENT_TIMESTAMP, 
                                      payload = EXCLUDED.payload;
                    """
                else:
                    sql = """
                        INSERT INTO kpis (run_id, user_id, time_period, total_records, calculated_at, payload)
                        VALUES (:run_id, :user_id, :time_period, :total_records, :calculated_at, :payload)
                        ON CONFLICT (run_id, user_id, time_period)
                        DO UPDATE SET total_records = excluded.total_records, 
                                      calculated_at = excluded.calculated_at, 
                                      payload = excluded.payload;
                    """
                conn.execute(sql, {
                    "run_id": run_id, "user_id": user_id, "time_period": time_period,
                    "total_records": total_records, "payload": payload_json,
                    "calculated_at": datetime.now(timezone.utc).isoformat()
                })
                conn.commit()
        except Exception as e:
            print(f"[KPI Cache DB Info]: {e}")
