import time
import io
import csv
from datetime import datetime, timezone
import pandas as pd
import numpy as np

from backend.config.settings import settings
from backend.config.db import get_db_cursor, execute_query
from backend.algorithms.text_cleaner import TextCleaner
from backend.algorithms.sentiment_analyzer import SentimentAnalyzer
from backend.algorithms.metrics_calculator import MetricsCalculator
from backend.algorithms.analytics_engine import AnalyticsEngine
from backend.algorithms.db_connector import DBConnector

def clean_database(run_id: str = None, chunk_size: int = 100000):
    t_start = time.time()
    cleaner = TextCleaner()
    sentiment_analyzer = SentimentAnalyzer()
    calculator = MetricsCalculator()
    db = DBConnector()
    engine = AnalyticsEngine()

    print("\n" + "="*70, flush=True)
    print(" [IN-DATABASE DATA CLEANING & ENRICHMENT PIPELINE]", flush=True)
    print("="*70, flush=True)

    # 1. Target range resolution
    id_range = execute_query("SELECT MIN(id) as min_id, MAX(id) as max_id, COUNT(*) as cnt FROM conversations WHERE clean_text IS NULL OR clean_text = '';", fetch_one=True)
    if not id_range or not id_range.get("cnt") or id_range["cnt"] == 0:
        print("[INFO] All records in PostgreSQL conversations table are already cleaned and enriched!", flush=True)
        return

    min_id = int(id_range["min_id"])
    max_id = int(id_range["max_id"])
    total_uncleaned = int(id_range["cnt"])

    if not run_id:
        r_row = execute_query("SELECT dataset_run_id FROM conversations WHERE clean_text IS NULL OR clean_text = '' LIMIT 1;", fetch_one=True)
        run_id = r_row["dataset_run_id"] if r_row else "default"

    print(f"   * Target Ingestion Run ID: {run_id}", flush=True)
    print(f"   * Records to Clean & Enrich: {total_uncleaned:,} (ID range: {min_id} - {max_id})", flush=True)
    print(f"   * Batch Processing Size: {chunk_size:,} records/chunk", flush=True)
    print("="*70 + "\n", flush=True)

    db.update_pipeline_status(run_id, "CLEAN_TEXT", "STARTED")

    processed_count = 0
    total_chunks = (total_uncleaned + chunk_size - 1) // chunk_size
    current_start = min_id
    chunk_idx = 0

    fetch_cols = ["id", "text", "inbound", "created_at"]
    update_cols = ["id", "clean_text", "sentiment", "sentiment_score", "confidence", "response_time_minutes"]

    while current_start <= max_id:
        current_end = current_start + chunk_size
        t_chunk = time.time()

        # 1. High-speed B-Tree indexed keyset fetch
        fetch_sql = f"""
        SELECT id, text, inbound, created_at
        FROM conversations
        WHERE id >= %s AND id < %s AND (clean_text IS NULL OR clean_text = '');
        """
        rows = execute_query(fetch_sql, (current_start, current_end), fetch_all=True)
        current_start = current_end

        if not rows:
            continue

        chunk_idx += 1
        df_chunk = pd.DataFrame(rows)
        n_rows = len(df_chunk)

        # 2. Vectorized text cleaning & sentiment inference
        df_chunk["clean_text"] = cleaner.clean_series(df_chunk["text"])
        c_sent, c_scores, c_conf = sentiment_analyzer.predict_fast_batch(df_chunk["clean_text"])
        df_chunk["sentiment"] = c_sent
        df_chunk["sentiment_score"] = c_scores
        df_chunk["confidence"] = c_conf
        df_chunk["response_time_minutes"] = 0.0

        # 3. Temporary Staging Table COPY + Set-Based UPDATE
        with get_db_cursor(commit=True, dict_cursor=False) as cur:
            cur.execute("""
            CREATE TEMP TABLE temp_enrichment (
                id BIGINT,
                clean_text TEXT,
                sentiment VARCHAR(50),
                sentiment_score NUMERIC,
                confidence NUMERIC,
                response_time_minutes NUMERIC
            ) ON COMMIT DROP;
            """)

            csv_buf = io.StringIO()
            df_chunk[update_cols].to_csv(
                csv_buf,
                sep=",",
                index=False,
                header=False,
                quoting=csv.QUOTE_MINIMAL,
                doublequote=True,
                na_rep=""
            )
            csv_buf.seek(0)

            cur.copy_expert("""
            COPY temp_enrichment (
                id, clean_text, sentiment, sentiment_score, confidence, response_time_minutes
            ) FROM STDIN WITH (FORMAT csv, DELIMITER ',', QUOTE '"', ESCAPE '"', NULL '');
            """, csv_buf)

            cur.execute("""
            UPDATE conversations AS c SET
                clean_text = t.clean_text,
                sentiment = t.sentiment,
                sentiment_score = t.sentiment_score,
                confidence = t.confidence,
                response_time_minutes = t.response_time_minutes
            FROM temp_enrichment AS t
            WHERE c.id = t.id;
            """)

        processed_count += n_rows
        pct = (processed_count / total_uncleaned) * 100.0
        elapsed_c = time.time() - t_chunk
        speed_c = int(n_rows / elapsed_c) if elapsed_c > 0 else n_rows
        print(f"  [Clean & Enrich {pct:5.1f}%] Batch {chunk_idx}/{total_chunks} processed ({processed_count:,} / {total_uncleaned:,} rows in {elapsed_c:.2f}s | {speed_c:,} rows/s)", flush=True)

    total_time = time.time() - t_start
    avg_throughput = int(processed_count / total_time) if total_time > 0 else processed_count
    print("\n" + "="*70, flush=True)
    print(f" [DATA CLEANING COMPLETE] Enriched {processed_count:,} rows in {total_time:.2f}s ({avg_throughput:,} rows/sec)", flush=True)
    print("="*70 + "\n", flush=True)

    db.update_pipeline_status(run_id, "DATA_ENRICHED", "SUCCESS")

    # 4. Generate Pre-Aggregated 15-Metric KPI Signature
    print(" [KPI SIGNATURE] Generating pre-aggregated 15-metric signature for Analysis Hub...", flush=True)
    analysis = engine.get_analysis_hub(user="deepak", run_id=run_id, filters={"run_id": run_id, "time_period": "weekly"})
    
    kpi_payload = {
        "run_id": run_id,
        "user": "deepak",
        "time_period": "weekly",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "total_records": processed_count,
        "kpi_metrics": analysis.get("kpi_metrics", {}),
        "kpi_pillars": analysis.get("kpi_pillars", {}),
        "sentiment_distribution": analysis.get("sentiment_distribution", {}),
        "topic_summaries": analysis.get("topic_summaries", []),
        "customer_pain_points": analysis.get("customer_pain_points", []),
        "llm_summary": analysis.get("llm_summary", "")
    }
    db.save_kpi_summary(kpi_payload)

    db.register_dataset_run({
        "run_id": run_id,
        "user": "deepak",
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "total_records": processed_count,
        "source_name": "twcs.csv",
        "status": "ready"
    })

    db.update_pipeline_status(run_id, "COMPLETE", "SUCCESS")
    print(f" -> Dataset Run '{run_id}' marked as READY with cached KPI signatures!", flush=True)

if __name__ == "__main__":
    clean_database()
