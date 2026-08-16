import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.config.settings import settings
import psycopg2

print("=== CHECKING POSTGRESQL STATUS ===")
try:
    conn = psycopg2.connect(
        host=settings.postgres_host,
        port=settings.postgres_port,
        user=settings.postgres_user,
        password=settings.postgres_password,
        dbname=settings.postgres_db
    )
    with conn.cursor() as cur:
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
        tables = cur.fetchall()
        print(f"PostgreSQL Database '{settings.postgres_db}' tables:")
        for t in tables:
            tname = t[0]
            try:
                cur.execute(f'SELECT COUNT(*) FROM "{tname}"')
                cnt = cur.fetchone()[0]
                print(f"  - {tname}: {cnt:,} rows")
            except Exception as e:
                print(f"  - {tname}: error {e}")
    conn.close()
except Exception as e:
    print(f"PostgreSQL connection error: {e}")

print("\n=== CHECKING SNOWFLAKE STATUS ===")
if settings.snowflake_account and settings.snowflake_user and settings.snowflake_password:
    try:
        import snowflake.connector
        conn_sf = snowflake.connector.connect(
            account=settings.snowflake_account,
            user=settings.snowflake_user,
            password=settings.snowflake_password,
            role=settings.snowflake_role or "ACCOUNTADMIN",
            warehouse=settings.snowflake_warehouse or "COMPUTE_WH",
            database=settings.snowflake_database or "VILA",
            schema=settings.snowflake_schema or "PUBLIC",
            login_timeout=10,
        )
        cur_sf = conn_sf.cursor()
        cur_sf.execute("SHOW TABLES")
        sf_tables = cur_sf.fetchall()
        print(f"Snowflake Database '{settings.snowflake_database}' tables:")
        for tbl in sf_tables:
            tname = tbl[1]
            try:
                cur_sf.execute(f'SELECT COUNT(*) FROM "{tname}"')
                cnt = cur_sf.fetchone()[0]
                print(f"  - {tname}: {cnt:,} rows")
            except Exception as e:
                print(f"  - {tname}: error {e}")
        conn_sf.close()
    except Exception as e:
        print(f"Snowflake connection error: {e}")
else:
    print("Snowflake credentials not configured.")
