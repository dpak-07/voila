from backend.config.db import get_db_cursor
import os
import shutil

TABLES_TO_TRUNCATE = [
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

def clean_database():
    print("[Clean DB] Starting database purge...")
    with get_db_cursor() as cur:
        for table in TABLES_TO_TRUNCATE:
            try:
                cur.execute(f"TRUNCATE TABLE \"{table}\" CASCADE;")
                print(f"  [OK] Truncated {table}")
            except Exception as e:
                print(f"  [FAIL] Table {table} error: {e}")

    # Remove temporary uploaded files or qdrant storage if any
    qdrant_path = os.path.join(os.path.dirname(__file__), "rag", "qdrant_storage", "collection")
    if os.path.exists(qdrant_path):
        try:
            for item in os.listdir(qdrant_path):
                p = os.path.join(qdrant_path, item)
                if os.path.isdir(p):
                    shutil.rmtree(p)
                else:
                    os.remove(p)
            print("  [OK] Cleared local Qdrant vector storage")
        except Exception as e:
            print(f"  [FAIL] Qdrant storage clean error: {e}")

    print("[Clean DB] Database successfully wiped and reset to clean empty state.")

if __name__ == "__main__":
    clean_database()
