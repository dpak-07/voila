from datetime import datetime
from pymongo import MongoClient
import pandas as pd
from backend.config.settings import settings

class DBConnector:
    """Manages database connection and exports pipeline metrics/records to MongoDB."""

    def __init__(self, uri: str = None, db_name: str = None):
        self.uri = uri or settings.mongo_uri
        self.db_name = db_name or settings.mongo_db
        self.client = MongoClient(self.uri)
        self.db = self.client[self.db_name]

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

    def save_dataframe(self, df: pd.DataFrame, collection_name: str = None) -> None:
        """Streams DataFrame directly into MongoDB in 50k chunks with zero memory duplication."""
        coll_name = collection_name or settings.mongo_collection
        collection = self.db[coll_name]
        
        # Clear old records
        collection.delete_many({})
        if df.empty:
            return

        total_records = len(df)
        chunk_size = 50000
        total_chunks = (total_records + chunk_size - 1) // chunk_size

        print("==========================================")
        print(f"WRITING TO MONGODB '{coll_name}' ({total_records:,} DOCUMENTS)")
        print("==========================================")

        for i in range(0, total_records, chunk_size):
            chunk_df = df.iloc[i : i + chunk_size]
            chunk_records = chunk_df.to_dict(orient="records")
            collection.insert_many(chunk_records, ordered=False)
            
            processed = min(i + len(chunk_df), total_records)
            pct = (processed / total_records) * 100.0
            curr_chunk = (i // chunk_size) + 1
            print(f"  [MongoDB Write Progress {pct:5.1f}%] Inserted chunk {curr_chunk}/{total_chunks} ({processed:,} / {total_records:,} documents)")

    def save_conversations(self, records: list, collection_name: str = None) -> None:
        """Saves processed conversation documents to MongoDB."""
        coll_name = collection_name or settings.mongo_collection
        collection = self.db[coll_name]
        
        collection.delete_many({})
        if not records:
            return

        total_records = len(records)
        chunk_size = 50000
        total_chunks = (total_records + chunk_size - 1) // chunk_size

        print("==========================================")
        print(f"WRITING TO MONGODB '{coll_name}' ({total_records:,} DOCUMENTS)")
        print("==========================================")

        for i in range(0, total_records, chunk_size):
            chunk = records[i : i + chunk_size]
            collection.insert_many(chunk, ordered=False)
            
            processed = min(i + len(chunk), total_records)
            pct = (processed / total_records) * 100.0
            curr_chunk = (i // chunk_size) + 1
            print(f"  [MongoDB Write Progress {pct:5.1f}%] Inserted chunk {curr_chunk}/{total_chunks} ({processed:,} / {total_records:,} documents)")

    def save_kpi_summary(self, kpi_payload: dict) -> None:
        """Saves calculated service KPIs and issue summaries to MongoDB."""
        kpi_coll = self.db["kpis"]
        kpi_coll.delete_many({})
        kpi_coll.insert_one(kpi_payload)

    def save_kpi_metrics(self, kpi_data: dict, summaries: list) -> None:
        """Saves calculated service KPIs and issue summaries to MongoDB."""
        kpi_coll = self.db["kpis"]
        kpi_coll.delete_many({})
        kpi_coll.insert_one({
            "calculated_at": datetime.utcnow().isoformat(),
            "kpi_metrics": kpi_data,
            "issue_summaries": summaries
        })
