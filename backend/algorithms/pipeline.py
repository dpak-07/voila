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

    def _normalize_raw_frame(self, df: pd.DataFrame, resolved_map: Dict[str, str]) -> pd.DataFrame:
        """Standardizes supported raw/conversation analytics schemas into backend columns."""
        text_col = resolved_map["text"]
        created_at_col = resolved_map["created_at"]
        id_col = resolved_map["tweet_id"]

        df_raw = df.copy()
        if id_col != "tweet_id":
            df_raw["tweet_id"] = df_raw[id_col]
        if text_col != "text":
            df_raw["text"] = df_raw[text_col]
        if created_at_col != "created_at":
            df_raw["created_at"] = df_raw[created_at_col]
        if "response_time_minutes" not in df_raw.columns:
            for resp_col in ["average_response_time_minutes", "first_response_time_minutes", "mean_response_time"]:
                if resp_col in df_raw.columns:
                    df_raw["response_time_minutes"] = pd.to_numeric(df_raw[resp_col], errors="coerce").fillna(0.0)
                    break
        if "topic_keywords" not in df_raw.columns:
            for topic_col in ["pain_point", "customer_pain_point", "complaint_category", "topic", "intent", "issue_type"]:
                if topic_col in df_raw.columns:
                    df_raw["topic_keywords"] = df_raw[topic_col].fillna("General Support").astype(str)
                    break
        if "sentiment" not in df_raw.columns:
            for sent_col in ["sentiment_end", "sentiment_start", "sentiment_label"]:
                if sent_col in df_raw.columns:
                    df_raw["sentiment"] = df_raw[sent_col].fillna("neutral").astype(str).str.lower()
                    break

        df_raw["dataset_run_id"] = self.run_id
        df_raw["user_id"] = self.user_id
        return df_raw

    def _enrich_frame(self, df_to_process: pd.DataFrame) -> pd.DataFrame:
        """Applies vectorized text cleaning, sentiment, response-time, and topic normalization."""
        df_to_process = df_to_process.copy()
        df_to_process["text"] = df_to_process["text"].fillna("").astype(str)
        df_to_process["clean_text"] = self.cleaner.clean_series(df_to_process["text"])

        existing_sentiment_ok = (
            "sentiment" in df_to_process.columns
            and df_to_process["sentiment"].notna().any()
            and not df_to_process["sentiment"].astype(str).str.lower().isin(["", "pending", "nan", "none"]).all()
        )
        if existing_sentiment_ok:
            normalized_sent = df_to_process["sentiment"].fillna("neutral").astype(str).str.lower()
            normalized_sent = normalized_sent.where(normalized_sent.isin(["positive", "negative", "neutral"]), "neutral")
            df_to_process["sentiment"] = normalized_sent
            df_to_process["sentiment_score"] = np.where(normalized_sent == "positive", 1, np.where(normalized_sent == "negative", -1, 0))
            if "confidence" not in df_to_process.columns:
                df_to_process["confidence"] = np.where(normalized_sent == "neutral", 0.70, 0.90)
        else:
            c_sent, c_scores, c_conf = self.sentiment_analyzer.predict_fast_batch(df_to_process["clean_text"])
            df_to_process["sentiment"] = c_sent
            df_to_process["sentiment_score"] = c_scores
            df_to_process["confidence"] = c_conf

        existing_resp = "response_time_minutes" in df_to_process.columns and pd.to_numeric(df_to_process["response_time_minutes"], errors="coerce").fillna(0).gt(0).any()
        if not existing_resp:
            for resp_col in ["average_response_time_minutes", "first_response_time_minutes", "mean_response_time"]:
                if resp_col in df_to_process.columns:
                    df_to_process["response_time_minutes"] = pd.to_numeric(df_to_process[resp_col], errors="coerce").fillna(0.0)
                    existing_resp = True
                    break
        if not existing_resp:
            calc_resp = self.calculator.calculate_response_times(df_to_process)
            df_to_process["response_time_minutes"] = calc_resp if not calc_resp.empty else 0.0

        if "topic_keywords" not in df_to_process.columns or df_to_process["topic_keywords"].astype(str).str.lower().isin(["", "pending ai discovery", "nan", "none"]).all():
            for topic_col in ["pain_point", "customer_pain_point", "complaint_category", "topic", "intent", "issue_type"]:
                if topic_col in df_to_process.columns:
                    df_to_process["topic_keywords"] = df_to_process[topic_col].fillna("General Support").astype(str)
                    break
        return df_to_process

    def _auto_resolve_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        """Dynamically identifies text, timestamp, and ID columns for any dataset."""
        cols_lower = {str(col).lower(): col for col in df.columns}
        resolved = {}

        # 1. Text Column Resolution
        text_candidates = [
            "text", "clean_text", "message", "content", "tweet", "comment", 
            "body", "review", "feedback", "description", "details", "notes",
            "context", "rag_text"
        ]
        user_text = self.map.get("text")
        if user_text and user_text in df.columns:
            resolved["text"] = user_text
        else:
            found_text = next((cols_lower[c] for c in text_candidates if c in cols_lower), None)
            if not found_text:
                signal_cols = [c for c in ["pain_point", "customer_pain_point", "intent", "issue_type", "brand", "product", "region"] if c in cols_lower]
                if signal_cols:
                    source_cols = [cols_lower[c] for c in signal_cols]
                    df["text"] = df[source_cols].fillna("").astype(str).agg(" ".join, axis=1).str.strip()
                    found_text = "text"
                else:
                    str_cols = [c for c in df.columns if df[c].dtype == "object" and str(c).lower() not in {"conversation_id", "tweet_id", "id"}]
                    if str_cols:
                        found_text = max(str_cols, key=lambda c: df[c].fillna("").astype(str).str.len().mean())
                    else:
                        found_text = df.columns[0]
            resolved["text"] = found_text

        # 2. Timestamp Column Resolution
        time_candidates = ["created_at", "start_time", "timestamp", "date", "datetime", "time", "posted_at", "created_date"]
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

            resolved_map = self._auto_resolve_columns(df)
            df_raw = self._normalize_raw_frame(df, resolved_map)

            print("\n[STEP 1/3] Direct Raw Streaming to PostgreSQL (COPY Expert) & Snowflake Warehouse...", flush=True)
            t_raw = time.time()
            self.db.save_raw_dataframe(df_raw, run_id=self.run_id, user_id=self.user_id, s3_file_key=s3_file_key)
            raw_time = time.time() - t_raw
            self.db.update_pipeline_status(self.run_id, "RAW_INGESTED", "SUCCESS")

            self.db.register_dataset_run({
                "run_id": self.run_id,
                "user": self.user_id,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "total_records": total_rows,
                "source_name": source_name,
                "status": "raw_ingested"
            })

            # -------------------------------------------------------------
            # STEP 2/3: FAST ANALYSIS & ENRICHMENT
            # -------------------------------------------------------------
            print("\n[STEP 2/3] Performing In-Memory Vectorized Cleaning & Sentiment Enrichment...", flush=True)
            t_clean = time.time()
            df_proc = self._enrich_frame(df_raw)
            self.db.save_processed_dataframe(
                df_proc,
                run_id=self.run_id,
                user_id=self.user_id,
                write_to_snowflake=False,
            )
            self.db.update_pipeline_status(self.run_id, "DATA_PROCESSED", "SUCCESS")

            # -------------------------------------------------------------
            # STEP 3/3: BASELINE KPI SIGNATURE
            # -------------------------------------------------------------
            from backend.algorithms.analytics_engine import AnalyticsEngine
            engine = AnalyticsEngine()
            kpi_payload = engine.run_dynamic_analysis(filters={"run_id": self.run_id, "user": self.user_id}, run_id=self.run_id, user=self.user_id)
            kpi_payload["run_id"] = self.run_id
            kpi_payload["user"] = self.user_id
            kpi_payload["created_at"] = datetime.now(timezone.utc).isoformat()
            kpi_payload["total_records"] = total_rows
            self.db.save_kpi_summary(kpi_payload)

            self.db.register_dataset_run({
                "run_id": self.run_id,
                "user": self.user_id,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "total_records": total_rows,
                "source_name": source_name,
                "status": "ready",
            })
            self.db.update_pipeline_status(self.run_id, "COMPLETE", "SUCCESS")
            return df_proc
        except Exception as e:
            print(f"\n[PIPELINE ERROR] Ingestion failed: {e}\n", flush=True)
            self.db.update_pipeline_status(self.run_id, "RUN", "FAILED", error=str(e))
            raise e

    def run_file(self, file_path: str, file_size_mb: float = 0.0) -> Optional[pd.DataFrame]:
        t0 = time.time()
        print(f" [LOAD FILE] Reading raw dataset from '{file_path}'...", flush=True)
        if file_path.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file_path)
        else:
            df = pd.read_csv(file_path)
        print(f"   -> Loaded {len(df):,} rows from file in {time.time()-t0:.2f}s", flush=True)
        return self.run_dataframe(df, source_name=file_path, file_size_mb=file_size_mb)


    def run_csv_streaming(
        self,
        file_path: str,
        source_name: str = None,
        file_size_mb: float = 0.0,
        s3_file_key: Optional[str] = None,
        chunk_size: int = 100000,
    ) -> Optional[pd.DataFrame]:
        """Streams very large CSVs through Postgres/Snowflake/RAG-ready processed storage without loading all rows at once."""
        pipeline_start_time = time.time()
        source_name = source_name or file_path
        self.db.update_pipeline_status(self.run_id, "INIT", "STARTED")

        try:
            print("\n" + "="*65, flush=True)
            print(f"[STREAMING CSV PIPELINE] Run ID: {self.run_id}", flush=True)
            print(f"   * Source: {source_name}", flush=True)
            print(f"   * Chunk Size: {chunk_size:,}", flush=True)
            print(f"   * Size: {file_size_mb:.2f} MB", flush=True)
            print("="*65 + "\n", flush=True)

            first_chunk = pd.read_csv(file_path, nrows=1000, low_memory=False)
            resolved_map = self._auto_resolve_columns(first_chunk)
            print(
                f"   -> Schema Alignment: Text='{resolved_map['text']}', "
                f"Timestamp='{resolved_map['created_at']}', ID='{resolved_map['tweet_id']}'",
                flush=True,
            )

            self.db.register_dataset_run({
                "run_id": self.run_id,
                "user": self.user_id,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "total_records": 0,
                "source_name": source_name,
                "status": "streaming",
            })

            total_rows = 0
            for chunk_index, chunk in enumerate(pd.read_csv(file_path, chunksize=chunk_size, low_memory=False), start=1):
                t_chunk = time.time()
                df_raw = self._normalize_raw_frame(chunk, resolved_map)
                self.db.save_raw_dataframe(
                    df_raw,
                    run_id=self.run_id,
                    user_id=self.user_id,
                    s3_file_key=None,
                    sync_snowflake=False,
                )

                df_proc = self._enrich_frame(df_raw)
                self.db.save_processed_dataframe(
                    df_proc,
                    run_id=self.run_id,
                    user_id=self.user_id,
                    write_to_snowflake=False,
                )

                total_rows += len(chunk)
                print(
                    f"  [STREAM CHUNK {chunk_index}] {len(chunk):,} rows processed "
                    f"({total_rows:,} cumulative) in {time.time() - t_chunk:.2f}s",
                    flush=True,
                )

            if s3_file_key:
                self.db.trigger_snowflake_s3_copy(run_id=self.run_id, user_id=self.user_id, s3_file_key=s3_file_key)

            self.db.update_pipeline_status(self.run_id, "DATA_PROCESSED", "SUCCESS")

            from backend.algorithms.analytics_engine import AnalyticsEngine
            engine = AnalyticsEngine()
            kpi_payload = engine.run_dynamic_analysis(filters={"run_id": self.run_id, "user": self.user_id}, run_id=self.run_id, user=self.user_id)
            kpi_payload["run_id"] = self.run_id
            kpi_payload["user"] = self.user_id
            kpi_payload["created_at"] = datetime.now(timezone.utc).isoformat()
            kpi_payload["total_records"] = total_rows
            self.db.save_kpi_summary(kpi_payload)

            self.db.register_dataset_run({
                "run_id": self.run_id,
                "user": self.user_id,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "total_records": total_rows,
                "source_name": source_name,
                "status": "ready",
            })

            print("\n" + "="*65, flush=True)
            print(f"[STREAMING CSV PIPELINE COMPLETE] Run ID: {self.run_id}", flush=True)
            print(f"   * Total Records: {total_rows:,}", flush=True)
            print(f"   * Total Duration: {time.time() - pipeline_start_time:.2f}s", flush=True)
            print("="*65 + "\n", flush=True)
            self.db.update_pipeline_status(self.run_id, "COMPLETE", "SUCCESS")
            return None
        except Exception as e:
            print(f"\n[STREAMING PIPELINE ERROR] Ingestion failed: {e}\n", flush=True)
            self.db.update_pipeline_status(self.run_id, "RUN", "FAILED", error=str(e))
            raise e

