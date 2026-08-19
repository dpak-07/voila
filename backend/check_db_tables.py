from backend.config.db import get_db_cursor

def inspect():
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = [r["table_name"] if isinstance(r, dict) else r[0] for r in cur.fetchall()]
        print("--- Database Tables & Row Counts ---")
        for t in tables:
            try:
                cur.execute(f"SELECT COUNT(*) as cnt FROM \"{t}\"")
                row = cur.fetchone()
                cnt = row["cnt"] if isinstance(row, dict) else row[0]
                print(f"{t}: {cnt:,} rows")
            except Exception as e:
                print(f"{t}: Error ({e})")

if __name__ == "__main__":
    inspect()
