# -*- coding: utf-8 -*-
"""
Migration: Add detected_language column to conversations & processed_conversations,
then back-fill all existing rows in batches of 10,000 using LanguageDetector.

Run from project root:
    python scripts/migrate_add_language.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import time
import pandas as pd
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from psycopg2 import extras
from backend.config.settings import settings
from backend.algorithms.language_detector import LanguageDetector

detector = LanguageDetector()


def get_conn(autocommit=False):
    conn = psycopg2.connect(
        host=settings.postgres_host,
        port=settings.postgres_port,
        user=settings.postgres_user,
        password=settings.postgres_password,
        dbname=settings.postgres_db,
        connect_timeout=10,
    )
    if autocommit:
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    return conn


def add_column_if_missing():
    print("[Migration] Applying DDL changes...", flush=True)
    ddl_statements = [
        "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS detected_language VARCHAR(10) DEFAULT 'en'",
        "ALTER TABLE processed_conversations ADD COLUMN IF NOT EXISTS detected_language VARCHAR(10) DEFAULT 'en'",
    ]
    index_stmt = "CREATE INDEX IF NOT EXISTS idx_conv_run_language ON conversations(dataset_run_id, detected_language)"

    # DDL with autocommit
    conn = get_conn(autocommit=True)
    cur = conn.cursor()
    for stmt in ddl_statements:
        try:
            cur.execute(stmt)
            print(f"  [OK] {stmt[:90].strip()}", flush=True)
        except Exception as e:
            print(f"  [SKIP] {stmt[:60].strip()} -> {e}", flush=True)

    # Index needs column to exist first
    try:
        cur.execute(index_stmt)
        print(f"  [OK] Index idx_conv_run_language created.", flush=True)
    except Exception as e:
        print(f"  [SKIP] Index -> {e}", flush=True)

    cur.close()
    conn.close()


def backfill_language(batch_size: int = 10_000):
    print(f"\n[Migration] Back-filling detected_language on conversations (batch={batch_size:,})...", flush=True)

    conn = get_conn()
    cur = conn.cursor(cursor_factory=extras.RealDictCursor)

    # Count rows to process
    cur.execute("SELECT COUNT(*) as n FROM conversations WHERE detected_language IS NULL OR detected_language = 'en'")
    total = int(cur.fetchone()["n"] or 0)
    print(f"  Rows to process: {total:,}", flush=True)

    if total == 0:
        print("  Nothing to back-fill.", flush=True)
        cur.close()
        conn.close()
        return

    offset = 0
    processed = 0
    t_start = time.time()

    while True:
        cur.execute(
            "SELECT id, clean_text FROM conversations ORDER BY id LIMIT %s OFFSET %s",
            (batch_size, offset)
        )
        rows = cur.fetchall()
        if not rows:
            break

        ids = [r["id"] for r in rows]
        texts = pd.Series([r.get("clean_text") or "" for r in rows])
        langs = detector.detect_series(texts)

        # Bulk update using execute_values
        update_data = list(zip(langs.tolist(), ids))
        extras.execute_values(
            cur,
            "UPDATE conversations AS c SET detected_language = data.lang FROM (VALUES %s) AS data(lang, id) WHERE c.id = data.id::bigint",
            update_data,
            template="(%s, %s)",
            page_size=1000
        )
        conn.commit()

        processed += len(rows)
        elapsed = time.time() - t_start
        rate = int(processed / max(0.001, elapsed))
        print(f"  -> {processed:,}/{total:,} rows ({rate:,}/sec)", flush=True)

        if len(rows) < batch_size:
            break
        offset += batch_size

    cur.close()
    conn.close()
    print(f"\n[Migration] Complete -- {processed:,} rows updated in {time.time()-t_start:.1f}s", flush=True)


if __name__ == "__main__":
    add_column_if_missing()
    backfill_language()
    print("\n[OK] Migration finished successfully.", flush=True)
