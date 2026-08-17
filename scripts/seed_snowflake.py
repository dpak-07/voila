import sys
from pathlib import Path
import pandas as pd
import psycopg2

# Add root repo directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.config.settings import settings

def sync_postgres_to_snowflake(limit: int = 100000, run_id: str = "benchmark_100k_run"):
    """
    Reads records from PostgreSQL 'conversations' table and bulk-loads them
    into Snowflake table 'SOCIAL_MEDIA_METRICS' using write_pandas.
    """
    print(f"=== SYNCING UP TO {limit:,} RECORDS FROM POSTGRESQL TO SNOWFLAKE ===", flush=True)

    if not (settings.snowflake_account and settings.snowflake_user and settings.snowflake_password):
        print("[Error]: Snowflake credentials not configured in backend/.env!", flush=True)
        return

    # 1. Fetch from PostgreSQL
    print("  [1/3] Reading records from PostgreSQL...", flush=True)
    conn_pg = psycopg2.connect(
        host=settings.postgres_host,
        port=settings.postgres_port,
        user=settings.postgres_user,
        password=settings.postgres_password,
        dbname=settings.postgres_db,
        connect_timeout=10
    )
    
    query = """
        SELECT 
            tweet_id,
            dataset_run_id,
            user_id,
            author_id,
            inbound,
            created_at,
            text,
            clean_text,
            sentiment,
            sentiment_score,
            confidence,
            priority,
            conversation_id,
            topic_id,
            topic_keywords,
            spike_detected,
            response_time_minutes
        FROM conversations
        WHERE dataset_run_id = %s
        ORDER BY id ASC
        LIMIT %s;
    """
    df = pd.read_sql_query(query, conn_pg, params=(run_id, limit))
    conn_pg.close()

    if df.empty:
        print(f"  [Notice]: No records found in PostgreSQL for run_id='{run_id}'. Seed PostgreSQL first!", flush=True)
        return

    print(f"  [2/3] Retrieved {len(df):,} records from PostgreSQL. Preparing Snowflake payload...", flush=True)

    # Convert column names to UPPERCASE for Snowflake compatibility
    df.columns = [c.upper() for c in df.columns]

    # 2. Connect to Snowflake and write_pandas
    import snowflake.connector
    from snowflake.connector.pandas_tools import write_pandas

    conn_sf = snowflake.connector.connect(
        account=settings.snowflake_account,
        user=settings.snowflake_user,
        password=settings.snowflake_password,
        role=settings.snowflake_role or "ACCOUNTADMIN",
        warehouse=settings.snowflake_warehouse or "COMPUTE_WH",
        database=settings.snowflake_database or "VOILA",
        schema=settings.snowflake_schema or "PUBLIC",
        login_timeout=15,
    )

    print("  [3/3] Streaming batches into Snowflake 'SOCIAL_MEDIA_METRICS'...", flush=True)
    success, nchunks, nrows, _ = write_pandas(
        conn_sf,
        df,
        table_name="SOCIAL_MEDIA_METRICS",
        auto_create_table=False,
        chunk_size=25000,
        use_logical_type=True
    )
    conn_sf.close()

    if success:
        print(f"=== SNOWFLAKE SEED COMPLETE: {nrows:,} rows synced across {nchunks} chunks! ===", flush=True)
    else:
        print(f"[Warning]: Snowflake upload completed with partial status (success={success}).", flush=True)

if __name__ == "__main__":
    records_to_sync = 100000
    if len(sys.argv) > 1:
        try:
            records_to_sync = int(sys.argv[1])
        except ValueError:
            pass
    sync_postgres_to_snowflake(records_to_sync)
