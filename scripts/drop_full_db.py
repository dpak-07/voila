import sys
from pathlib import Path

# Add root repo directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from backend.config.settings import settings

def drop_and_recreate_db():
    db_name = settings.postgres_db
    print(f"=== DROPPING FULL DATABASE: {db_name} ===", flush=True)

    # Connect to default postgres database
    conn = psycopg2.connect(
        host=settings.postgres_host,
        port=settings.postgres_port,
        user=settings.postgres_user,
        password=settings.postgres_password,
        dbname="postgres",
        connect_timeout=5
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    with conn.cursor() as cur:
        # Terminate active connections
        cur.execute("""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = %s AND pid <> pg_backend_pid();
        """, (db_name,))
        print(f"  [PostgreSQL] Terminated active sessions on '{db_name}'.", flush=True)

        # Drop target database
        cur.execute(f'DROP DATABASE IF EXISTS "{db_name}";')
        print(f"  [PostgreSQL] Dropped database '{db_name}'.", flush=True)

        # Recreate clean database
        cur.execute(f'CREATE DATABASE "{db_name}";')
        print(f"  [PostgreSQL] Re-created clean database '{db_name}'.", flush=True)

    conn.close()

    # Re-apply schema DDL
    schema_dir = Path("database/postgres")
    schema_path = schema_dir / "init_schema.sql"
    if not schema_path.exists():
        schema_path = schema_dir / "schema.sql"

    if schema_path.exists():
        sql = schema_path.read_text(encoding="utf-8")
        conn_new = psycopg2.connect(
            host=settings.postgres_host,
            port=settings.postgres_port,
            user=settings.postgres_user,
            password=settings.postgres_password,
            dbname=db_name,
            connect_timeout=5
        )
        with conn_new.cursor() as cur:
            cur.execute(sql)
            
            # Seed default demo user 'deepak' with password 'password123'
            from backend.auth.jwt import hash_password
            pwd_hash = hash_password("password123")
            cur.execute("""
                INSERT INTO users (username, email, password_hash, is_active)
                VALUES ('deepak', 'deepak@voila.ai', %s, TRUE)
                ON CONFLICT (username) DO NOTHING;
            """, (pwd_hash,))

        conn_new.commit()
        conn_new.close()
        print(f"  [PostgreSQL] Applied full DDL schema and seeded default user 'deepak'.", flush=True)

    # Snowflake check
    if settings.snowflake_account and settings.snowflake_user and settings.snowflake_password:
        try:
            import snowflake.connector
            conn_sf = snowflake.connector.connect(
                account=settings.snowflake_account,
                user=settings.snowflake_user,
                password=settings.snowflake_password,
                role=settings.snowflake_role or "ACCOUNTADMIN",
                warehouse=settings.snowflake_warehouse or "COMPUTE_WH",
                database=settings.snowflake_database or "VOILA",
                schema=settings.snowflake_schema or "PUBLIC",
                login_timeout=10,
            )
            cur_sf = conn_sf.cursor()
            for tbl in ["PROCESSED_SOCIAL_MEDIA_METRICS", "SOCIAL_MEDIA_METRICS", "CONVERSATION_TOPICS", "CUSTOMER_CONVERSATIONS"]:
                try:
                    cur_sf.execute(f"TRUNCATE TABLE IF EXISTS {tbl};")
                    print(f"  [Snowflake] Truncated {tbl}.", flush=True)
                except Exception as se:
                    pass

            # Apply Snowflake DDL to ensure clean schema
            sf_ddl_path = Path("database/snowflake/social_media_metrics.sql")
            if sf_ddl_path.exists():
                ddl_sql = sf_ddl_path.read_text(encoding="utf-8")
                for stmt in ddl_sql.split(";"):
                    stmt = stmt.strip()
                    if stmt:
                        cur_sf.execute(stmt)
                print("  [Snowflake] Verified and applied DDL schema for SOCIAL_MEDIA_METRICS.", flush=True)

            conn_sf.close()
            print("  [Snowflake] Snowflake cleaned and ready.", flush=True)
        except Exception as sfe:
            print(f"  [Snowflake Notice]: {sfe}", flush=True)

    print("\n=== FULL DATABASE RE-CREATION COMPLETE ===", flush=True)

if __name__ == "__main__":
    drop_and_recreate_db()
