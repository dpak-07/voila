import os
import shutil
from backend.config.settings import settings
from backend.config.db import get_db_cursor

SQL_TABLES_TO_TRUNCATE = [
    "conversations",
    "processed_conversations",
    "dataset_runs",
    "dataset_kpis",
    "kpi_topics",
    "kpi_topic_samples",
    "kpi_sentiment",
    "kpi_trends",
    "kpi_issues",
    "kpi_new_issues",
    "kpi_emerging_issues",
    "kpi_recurring_issues",
    "kpi_priorities",
    "kpi_recommendations",
    "pipeline_status",
    "pipeline_history",
    "agent_conversations",
    "agent_tools",
    "audit_logs"
]

SNOWFLAKE_TABLES_TO_TRUNCATE = [
    "SOCIAL_MEDIA_METRICS",
    "PROCESSED_SOCIAL_MEDIA_METRICS",
    "STG_CONVERSATIONS",
    "PROCESSED_CONVERSATIONS",
    "DATASET_RUNS",
    "DATASET_KPIS",
    "CONVERSATIONS"
]

def clean_sql_database():
    print("\n=======================================================")
    print(" [1/3] CLEANING POSTGRESQL DATABASE")
    print("=======================================================")
    with get_db_cursor(commit=True) as cur:
        for table in SQL_TABLES_TO_TRUNCATE:
            try:
                cur.execute(f"TRUNCATE TABLE \"{table}\" CASCADE;")
                print(f"  [OK] Truncated PostgreSQL table: {table}")
            except Exception as e:
                print(f"  [-] PostgreSQL table {table} skipped or not found ({e})")

def clean_snowflake_warehouse():
    print("\n=======================================================")
    print(" [2/3] CLEANING SNOWFLAKE CLOUD DATA WAREHOUSE")
    print("=======================================================")
    acct = (settings.snowflake_account or "").lower()
    if not (settings.snowflake_account and settings.snowflake_user and settings.snowflake_password) or "placeholder" in acct or "your_" in acct:
        print("  [INFO] Snowflake credentials not configured or placeholder detected. Skipping Snowflake cloud purge.")
        return

    try:
        import snowflake.connector
        conn = snowflake.connector.connect(
            account=settings.snowflake_account,
            user=settings.snowflake_user,
            password=settings.snowflake_password,
            role=settings.snowflake_role or "ACCOUNTADMIN",
            warehouse=settings.snowflake_warehouse or "COMPUTE_WH",
            database=settings.snowflake_database or "VILA",
            schema=settings.snowflake_schema or "PUBLIC",
            login_timeout=10,
            network_timeout=15,
            insecure_mode=True,
            client_session_keep_alive=False
        )
        cur = conn.cursor(snowflake.connector.DictCursor)
        
        # Check existing tables in Snowflake
        cur.execute("SHOW TABLES")
        existing_tables = {r["name"].upper() for r in cur.fetchall()}
        print(f"  [INFO] Snowflake Tables Found: {existing_tables or 'None'}")

        for tbl in SNOWFLAKE_TABLES_TO_TRUNCATE:
            if tbl in existing_tables:
                try:
                    cur.execute(f"TRUNCATE TABLE {tbl}")
                    print(f"  [OK] Truncated Snowflake table: {tbl}")
                except Exception as e:
                    print(f"  [-] Failed to truncate Snowflake table {tbl}: {e}")
            else:
                print(f"  [-] Snowflake table {tbl} does not exist in schema (skipped)")

        conn.close()
        print("  [OK] Snowflake cloud tables cleaned successfully.")
    except Exception as e:
        print(f"  [-] Snowflake connection / purge error: {e}")

def clean_local_storage_and_cache():
    print("\n=======================================================")
    print(" [3/3] CLEANING LOCAL EMBEDDINGS & QDRANT STORAGE")
    print("=======================================================")
    qdrant_path = os.path.join(os.path.dirname(__file__), "rag", "qdrant_storage", "collection")
    if os.path.exists(qdrant_path):
        try:
            for item in os.listdir(qdrant_path):
                p = os.path.join(qdrant_path, item)
                if os.path.isdir(p):
                    shutil.rmtree(p)
                else:
                    os.remove(p)
            print("  [OK] Cleared local Qdrant collection vector files")
        except Exception as e:
            print(f"  [-] Qdrant clean error: {e}")
    else:
        print("  [OK] Qdrant vector storage is clean")

if __name__ == "__main__":
    clean_sql_database()
    clean_snowflake_warehouse()
    clean_local_storage_and_cache()
    print("\n=======================================================")
    print(" [SUCCESS] SQL & SNOWFLAKE PURGE COMPLETE")
    print("=======================================================\n")
