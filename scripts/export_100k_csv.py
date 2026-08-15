import sys
from pathlib import Path
import pandas as pd
import psycopg2

# Add root repo directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.config.settings import settings

def export_100k_csv():
    out_path = Path("data/voila_100k_benchmark_dataset.csv")
    print(f"=== EXPORTING 100,000 RECORDS TO {out_path} ===", flush=True)
    
    conn = psycopg2.connect(
        host=settings.postgres_host,
        port=settings.postgres_port,
        user=settings.postgres_user,
        password=settings.postgres_password,
        dbname=settings.postgres_db,
        connect_timeout=10
    )
    
    sql = """
    SELECT 
        tweet_id, author_id, company as brand, product, region, inbound,
        created_at, text, sentiment, sentiment_score, priority,
        topic_keywords as topic_cluster, response_time_minutes,
        resolution_flag as is_resolved, fcr, escalated, reopened
    FROM conversations
    ORDER BY id ASC
    LIMIT 100000;
    """
    
    df = pd.read_sql_query(sql, conn)
    conn.close()
    
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False)
    print(f"  [Export Complete]: {len(df):,} records written to {out_path} (Size: {out_path.stat().st_size / 1024 / 1024:.2f} MB)", flush=True)

if __name__ == "__main__":
    export_100k_csv()
