import psycopg2
from psycopg2 import pool, extras
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from contextlib import contextmanager
from pathlib import Path
from typing import Generator, Any, List, Dict, Optional
import threading

from .settings import settings

_pool: Optional[pool.ThreadedConnectionPool] = None
_pool_lock = threading.Lock()
_schema_bootstrapped = False

def _ensure_database_exists():
    """Connects to default postgres database to check and create target database if needed."""
    try:
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
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (settings.postgres_db,))
            exists = cur.fetchone()
            if not exists:
                cur.execute(f'CREATE DATABASE "{settings.postgres_db}"')
                print(f"[PostgreSQL Setup] Created database '{settings.postgres_db}'.", flush=True)
        conn.close()
    except Exception as e:
        print(f"[PostgreSQL DB Check Warning]: {e}", flush=True)

def _apply_schema():
    """Executes the DDL schema to ensure all tables, indexes, and constraints exist."""
    global _schema_bootstrapped
    if _schema_bootstrapped:
        return
    try:
        schema_dir = Path(__file__).resolve().parents[2] / "database" / "postgres"
        schema_path = schema_dir / "init_schema.sql"
        if not schema_path.exists():
            schema_path = schema_dir / "schema.sql"
        if schema_path.exists():
            sql = schema_path.read_text(encoding="utf-8")
            conn = psycopg2.connect(
                host=settings.postgres_host,
                port=settings.postgres_port,
                user=settings.postgres_user,
                password=settings.postgres_password,
                dbname=settings.postgres_db,
                connect_timeout=5
            )
            with conn.cursor() as cur:
                cur.execute(sql)
            conn.commit()
            conn.close()
            print("[PostgreSQL Setup] DDL schema & tables verified successfully.", flush=True)
        _schema_bootstrapped = True
    except Exception as e:
        print(f"[PostgreSQL Schema Warning]: {e}", flush=True)
        _schema_bootstrapped = True

def get_connection_pool() -> pool.ThreadedConnectionPool:
    """Initializes and returns the singleton connection pool in a thread-safe manner."""
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                _ensure_database_exists()
                _apply_schema()
                try:
                    _pool = pool.ThreadedConnectionPool(
                        minconn=2,
                        maxconn=50,
                        host=settings.postgres_host,
                        port=settings.postgres_port,
                        user=settings.postgres_user,
                        password=settings.postgres_password,
                        dbname=settings.postgres_db,
                        connect_timeout=5
                    )
                except Exception as e:
                    print(f"[PostgreSQL Pool Error]: {e}", flush=True)
                    raise e
    return _pool

@contextmanager
def get_db_connection() -> Generator[psycopg2.extensions.connection, None, None]:
    """Context manager for acquiring and releasing a connection from the pool."""
    p = get_connection_pool()
    conn = p.getconn()
    try:
        yield conn
    finally:
        p.putconn(conn)

@contextmanager
def get_db_cursor(commit: bool = False, dict_cursor: bool = True) -> Generator[psycopg2.extensions.cursor, None, None]:
    """Context manager providing a cursor with automatic commit/rollback and dict representation."""
    with get_db_connection() as conn:
        cursor_factory = extras.RealDictCursor if dict_cursor else None
        cur = conn.cursor(cursor_factory=cursor_factory)
        try:
            yield cur
            if commit:
                conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()

def execute_query(sql: str, params: Any = None, fetch_one: bool = False, fetch_all: bool = False, commit: bool = False) -> Any:
    """Convenience helper for fast parameterized query execution."""
    with get_db_cursor(commit=commit, dict_cursor=True) as cur:
        cur.execute(sql, params)
        if fetch_one:
            return cur.fetchone()
        if fetch_all:
            return cur.fetchall()
        return None