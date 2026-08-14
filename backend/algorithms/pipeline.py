import uuid
import sys
import os
import time
from datetime import datetime, timezone
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Optional, Dict, Any, List

from backend.config.settings import settings
from backend.algorithms.text_cleaner import TextCleaner
from backend.algorithms.sentiment_analyzer import SentimentAnalyzer
from backend.algorithms.topic_clustering import TopicClusterer
from backend.algorithms.spike_detector import SpikeDetector
from backend.algorithms.metrics_calculator import MetricsCalculator
from backend.algorithms.db_connector import DBConnector

class DataIngestionPipeline:
    """
    Production ELT Ingestion Pipeline:
    1. RAW INGESTION FIRST: Inserts untouched raw data directly into PostgreSQL & Snowflake in seconds.
    2. IN-DATABASE ENRICHMENT: Cleans text, calculates sentiment polarity, and computes response times on DB rows.
    3. BASELINE KPI SIGNATURE: Caches 15-metric baseline and registers dataset run.
    4. DYNAMIC TOPIC ANALYTICS: AI Agent queries live database on-demand.
    """

    def __init__(self, run_id: str = None, column_mapping: Dict[str, str] = None, user_id: str = "deepak"):
        self.run_id = run_id or str(uuid.uuid4())
        self.user_id = user_id or "deepak"
        self.map = column_mapping or {}
        
        self.cleaner = TextCleaner()
        self.sentiment_analyzer = SentimentAnalyzer()
        self.clusterer = TopicClusterer()
        self.spike_detector = SpikeDetector()
        self.calculator = MetricsCalculator()
        self.db = DBConnector()

    def _auto_resolve_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        """Dynamically identifies text, timestamp, and ID columns for any dataset."""
        cols_lower = {str(col).lower(): col for col in df.columns}
        resolved = {}

        # 1. Text Column Resolution
        text_candidates = [
            "text", "clean_text", "message", "content", "tweet", "comment", 
            "body", "review", "feedback", "description", "details", "notes"
        ]
        user_text = self.map.get("text")
        if user_text and user_text in df.columns:
            resolved["text"] = user_text
        else:
            found_text = next((cols_lower[c] for c in text_candidates if c in cols_lower), None)
            if not found_text:
                str_cols = [c for c in df.columns if df[c].dtype == "object"]
                found_text = str_cols[0] if str_cols else df.columns[0]
            resolved["text"] = found_text

        # 2. Timestamp Column Resolution
        time_candidates = ["created_at", "timestamp", "date", "datetime", "time", "posted_at", "created_date"]
        user_time = self.map.get("created_at")
        if user_time and user_time in df.columns:
            resolved["created_at"] = user_time
        else:
            found_time = next((cols_lower[c] for c in time_candidates if c in cols_lower), None)
            if not found_time:
                df["created_at"] = datetime.now(timezone.utc).isoformat()
                found_time = "created_at"
            resolved["created_at"] = found_time

        # 3. ID Column Resolution
        id_candidates = ["tweet_id", "id", "message_id", "post_id", "review_id", "ticket_id", "response_id"]
        user_id = self.map.get("tweet_id")
        if user_id and user_id in df.columns:
            resolved["tweet_id"] = user_id
        else:
            found_id = next((cols_lower[c] for c in id_candidates if c in cols_lower), None)
            if not found_id:
                df["tweet_id"] = range(1, len(df) + 1)
                found_id = "tweet_id"
            resolved["tweet_id"] = found_id

        resolved["inbound"] = self.map.get("inbound", cols_lower.get("inbound", "inbound"))
        resolved["author_id"] = self.map.get("author_id", cols_lower.get("author_id", "author_id"))
        resolved["response_tweet_id"] = self.map.get("response_tweet_id", cols_lower.get("response_tweet_id", "response_tweet_id"))
        resolved["in_response_to_tweet_id"] = self.map.get("in_response_to_tweet_id", cols_lower.get("in_response_to_tweet_id", "in_response_to_tweet_id"))

        return resolved

    def run_dataframe(self, df: pd.DataFrame, source_name: str = "In-Memory Buffer", file_size_mb: float = 0.0, s3_file_key: Optional[str] = None) -> Optional[pd.DataFrame]:
        """Executes the ELT pipeline: Raw Ingestion -> In-DB Cleaning & Enrichment -> KPI Caching."""
        pipeline_start_time = time.time()
        self.db.update_pipeline_status(self.run_id, "INIT", "STARTED")

        try:
            total_rows = len(df)
            print(f"\n=======================================================", flush=True)
            print(f"[DATASET SPECIFICATIONS]", flush=True)
            print(f"   * Data Source: {source_name}", flush=True)
            if file_size_mb > 0:
                print(f"   * Size on Disk: {file_size_mb:.2f} MB", flush=True)
            print(f"   * Authenticated User: {self.user_id}", flush=True)
            print(f"   * Ingestion Run ID: {self.run_id}", flush=True)
            print(f"   * Total Input Records: {total_rows:,} rows, {len(df.columns)} columns", flush=True)
            print(f"=======================================================\n", flush=True)

            # Auto-resolve schema
            resolved_map = self._auto_resolve_columns(df)
            text_col = resolved_map["text"]
            created_at_col = resolved_map["created_at"]
            id_col = resolved_map["tweet_id"]

            print(f"   -> Schema Alignment: Text='{text_col}', Timestamp='{created_at_col}', ID='{id_col}'", flush=True)

            # Standardize column names for raw streaming
            df_raw = df.copy()
            if id_col != "tweet_id":
                df_raw["tweet_id"] = df_raw[id_col]
            if text_col != "text":
                df_raw["text"] = df_raw[text_col]
            if created_at_col != "created_at":
                df_raw["created_at"] = df_raw[created_at_col]
            
            df_raw["dataset_run_id"] = self.run_id
            df_raw["user_id"] = self.user_id

            # -------------------------------------------------------------
            # STEP 1/3: RAW INGESTION FIRST (Stream to PostgreSQL & Snowflake)
            # -------------------------------------------------------------
            print("\n[STEP 1/3] Direct Raw Streaming to PostgreSQL (COPY Expert) & Snowflake Warehouse...", flush=True)
            t_raw = time.time()
            self.db.save_raw_dataframe(df_raw, run_id=self.run_id, user_id=self.user_id, s3_file_key=s3_file_key)
            raw_time = time.time() - t_raw
            self.db.update_pipeline_status(self.run_id, "RAW_INGESTED", "SUCCESS")

            # Register run catalog entry
            self.db.register_dataset_run({
                "run_id": self.run_id,
                "user": self.user_id,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "total_records": total_rows,
                "source_name": source_name,
                "status": "raw_ingested"
            })

            # -------------------------------------------------------------
            # STEP 2/3: IN-DATABASE CLEANING & SENTIMENT ENRICHMENT
            # -------------------------------------------------------------
            print("\n[STEP 2/3] Performing Vectorized Cleaning, Sentiment Analysis & Response Times...", flush=True)
            t_clean = time.time()
            
            df_raw["text"] = df_raw["text"].fillna("").astype(str)
            df_raw["clean_text"] = self.cleaner.clean_series(df_raw["text"])
            
            c_sent, c_scores, c_conf = self.sentiment_analyzer.predict_fast_batch(df_raw["clean_text"])
            df_raw["sentiment"] = c_sent
            df_raw["sentiment_score"] = c_scores
            df_raw["confidence"] = c_conf

            # Calculate response times
            calc_resp = self.calculator.calculate_response_times(df_raw)
            df_raw["response_time_minutes"] = calc_resp if not calc_resp.empty else 0.0

            # Batch update the enriched columns in PostgreSQL
            self.db.update_enriched_dataframe(df_raw, run_id=self.run_id, chunk_size=50000)
            clean_time = time.time() - t_clean
            self.db.update_pipeline_status(self.run_id, "DATA_ENRICHED", "SUCCESS")

            # -------------------------------------------------------------
            # STEP 3/3: BASELINE KPI SIGNATURE GENERATION
            # -------------------------------------------------------------
            print("\n[STEP 3/3] Generating Baseline KPI Signature & Finalizing Run Catalog...", flush=True)
            t_kpi = time.time()
            from backend.algorithms.analytics_engine import AnalyticsEngine
            engine = AnalyticsEngine()
            prev_payload = engine._get_previous_signature(user=self.user_id, run_id=self.run_id)
            kpi_payload = engine.calculate_all_15_metrics(df_raw, time_period="weekly", previous_payload=prev_payload)
            kpi_payload["run_id"] = self.run_id
            kpi_payload["user"] = self.user_id
            kpi_payload["created_at"] = datetime.now(timezone.utc).isoformat()
            kpi_payload["total_records"] = total_rows

            self.db.save_kpi_summary(kpi_payload)

            # Update dataset run catalog status to ready
            self.db.register_dataset_run({
                "run_id": self.run_id,
                "user": self.user_id,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "total_records": total_rows,
                "source_name": source_name,
                "status": "ready"
            })

            total_duration = time.time() - pipeline_start_time
            overall_throughput = int(total_rows / total_duration) if total_duration > 0 else total_rows

            print(f"\n=======================================================", flush=True)
            print(f"[ELT PIPELINE COMPLETE] All Raw Data Stored & Cleaned in Database", flush=True)
            print(f"   * Ingestion Run ID: {self.run_id}", flush=True)
            print(f"   * Total Records: {total_rows:,}", flush=True)
            print(f"   * Stage 1 (Raw Ingestion): {raw_time:.2f}s", flush=True)
            print(f"   * Stage 2 (In-DB Cleaning & Sentiment): {clean_time:.2f}s", flush=True)
            print(f"   * Stage 3 (KPI Baseline & Catalog): {time.time()-t_kpi:.2f}s", flush=True)
            print(f"   * Total Ingestion Duration: {total_duration:.2f} seconds ({overall_throughput:,} rows/sec)", flush=True)
            print(f"   * Resolution Rate: {kpi_payload['kpi_metrics'].get('resolution_rate', 0):.1f}%", flush=True)
            print(f"   * Mean Response Time: {kpi_payload['kpi_metrics'].get('avg_response_time_minutes', 0):.1f} min", flush=True)
            print(f"=======================================================\n", flush=True)

            self.db.update_pipeline_status(self.run_id, "COMPLETE", "SUCCESS")
            return df_raw

        except Exception as e:
            print(f"\n[PIPELINE ERROR] Ingestion failed: {e}\n", flush=True)
            self.db.update_pipeline_status(self.run_id, "RUN", "FAILED", error=str(e))
            raise e

    def run(self, file_path: str) -> Optional[pd.DataFrame]:
        """Loads dataset from file and passes directly to run_dataframe."""
        t0 = time.time()
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024) if os.path.exists(file_path) else 0.0
        print(f" [LOAD FILE] Reading raw dataset from '{file_path}'...", flush=True)
        if file_path.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file_path)
        else:
            df = pd.read_csv(file_path)
        print(f"   -> Loaded {len(df):,} rows from file in {time.time()-t0:.2f}s", flush=True)
        return self.run_dataframe(df, source_name=file_path, file_size_mb=file_size_mb)

