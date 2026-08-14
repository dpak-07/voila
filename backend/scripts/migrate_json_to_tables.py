"""One-time migration runner: JSONB blobs -> normalized relational tables.

Usage (from backend/): python -m scripts.migrate_json_to_tables
Idempotent: detects whether the legacy kpi_payload column still exists and skips if already migrated.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config.db import execute_query  # noqa: E402

SCHEMA_DIR = Path(__file__).resolve().parents[2] / "database" / "postgres"
MIGRATION_FILE = SCHEMA_DIR / "migrate_json_to_tables.sql"


def column_exists(table: str, column: str) -> bool:
    row = execute_query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = %s AND column_name = %s",
        (table, column),
        fetch_one=True,
    )
    return bool(row)


def run():
    if not column_exists("dataset_kpis", "kpi_payload"):
        print("[Migration] JSONB -> tables already applied (kpi_payload column absent). Skipping.", flush=True)
        return

    sql = MIGRATION_FILE.read_text(encoding="utf-8")
    statements = [s.strip() for s in sql.split(";") if s.strip()]

    ok, failed = 0, 0
    for stmt in statements:
        try:
            execute_query(stmt, commit=True)
            ok += 1
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"[Migration] Statement failed (continuing): {e}", flush=True)

    print(f"[Migration] Applied {ok} statements, {failed} failures.", flush=True)


if __name__ == "__main__":
    run()
