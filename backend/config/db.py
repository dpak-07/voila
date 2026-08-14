import os
import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from .settings import settings

class SQLResult:
    def __init__(self, cursor, dialect="sqlite"):
        self.cursor = cursor
        self.dialect = dialect

    def fetchall(self) -> List[Tuple]:
        if self.cursor:
            return self.cursor.fetchall()
        return []

    def fetchone(self) -> Optional[Tuple]:
        if self.cursor:
            return self.cursor.fetchone()
        return None

class SQLConnection:
    def __init__(self, raw_conn, dialect="sqlite"):
        self.raw_conn = raw_conn
        self.dialect = dialect

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self.commit()
        self.close()

    def _normalize_sql(self, sql_str: str, params: Optional[Dict[str, Any]] = None) -> Tuple[str, Any]:
        """Normalizes named :param syntax across PostgreSQL and SQLite."""
        if not isinstance(sql_str, str):
            sql_str = str(sql_str)

        if self.dialect == "sqlite":
            # Strip PostgreSQL type casting
            sql_str = sql_str.replace("::jsonb", "")
            sql_str = sql_str.replace("::JSONB", "")
            sql_str = sql_str.replace("::json", "")
            sql_str = sql_str.replace("CURRENT_TIMESTAMP", "DATETIME('now')")
            sql_str = sql_str.replace("TRUE", "1").replace("FALSE", "0")
            sql_str = sql_str.replace("true", "1").replace("false", "0")

        return sql_str, params or {}

    def execute(self, sql_statement: Any, params: Optional[Dict[str, Any]] = None) -> SQLResult:
        sql_str = str(sql_statement)
        sql_clean, clean_params = self._normalize_sql(sql_str, params)
        cursor = self.raw_conn.cursor()
        
        if clean_params:
            cursor.execute(sql_clean, clean_params)
        else:
            cursor.execute(sql_clean)
            
        return SQLResult(cursor, dialect=self.dialect)

    def commit(self):
        try:
            self.raw_conn.commit()
        except Exception:
            pass

    def close(self):
        try:
            self.raw_conn.close()
        except Exception:
            pass

class SQLEngine:
    def __init__(self):
        self.dialect = "sqlite"
        self.db_url = settings.database_url
        self._init_connection()

    def _init_connection(self):
        # Attempt PostgreSQL if psycopg2 is available and database_url is configured
        if self.db_url and "postgresql" in self.db_url:
            try:
                import psycopg2
                test_conn = psycopg2.connect(
                    host=settings.postgres_host,
                    port=settings.postgres_port,
                    user=settings.postgres_user,
                    password=settings.postgres_password,
                    dbname=settings.postgres_db,
                    connect_timeout=3
                )
                test_conn.close()
                self.dialect = "postgresql"
                print(f"[DATABASE] Connected to PostgreSQL at {settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}")
                return
            except Exception as e:
                print(f"[DB INFO] PostgreSQL connection fallback: {e}. Using local high-speed SQLite engine.")
        
        self.dialect = "sqlite"
        db_dir = Path(__file__).resolve().parents[2] / "database"
        db_dir.mkdir(parents=True, exist_ok=True)
        self.sqlite_path = str(db_dir / "voila.db")
        print(f"[DATABASE] Initialized SQL Database Engine: {self.sqlite_path}")

    def connect(self) -> SQLConnection:
        if self.dialect == "postgresql":
            import psycopg2
            conn = psycopg2.connect(
                host=settings.postgres_host,
                port=settings.postgres_port,
                user=settings.postgres_user,
                password=settings.postgres_password,
                dbname=settings.postgres_db
            )
            return SQLConnection(conn, dialect="postgresql")
        else:
            conn = sqlite3.connect(self.sqlite_path, timeout=30.0)
            conn.row_factory = sqlite3.Row
            return SQLConnection(conn, dialect="sqlite")

    def execute(self, sql: str, params: Optional[Dict[str, Any]] = None) -> SQLResult:
        with self.connect() as conn:
            return conn.execute(sql, params)

engine = SQLEngine()
DB_DIALECT = engine.dialect

def init_db():
    """Initializes tables using init_schema.sql DDL."""
    schema_path = Path(__file__).resolve().parents[2] / "database" / "postgres" / "init_schema.sql"
    if schema_path.exists():
        try:
            with open(schema_path, "r", encoding="utf-8") as f:
                ddl = f.read()
            
            if engine.dialect == "sqlite":
                ddl = ddl.replace("TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP", "TEXT DEFAULT (DATETIME('now'))")
                ddl = ddl.replace("TIMESTAMP WITH TIME ZONE", "TEXT")
                ddl = ddl.replace("JSONB", "TEXT")
                ddl = ddl.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
                ddl = ddl.replace("BIGINT", "INTEGER")
                ddl = ddl.replace("BOOLEAN DEFAULT TRUE", "INTEGER DEFAULT 1")
                ddl = ddl.replace("BOOLEAN DEFAULT FALSE", "INTEGER DEFAULT 0")
                ddl = ddl.replace("BOOLEAN", "INTEGER")

            with engine.connect() as conn:
                for statement in ddl.split(";"):
                    stmt = statement.strip()
                    if stmt:
                        try:
                            conn.execute(stmt)
                        except Exception as stmt_err:
                            pass
                conn.commit()
        except Exception as e:
            print(f"[DB INIT INFO] Schema initialization warning: {e}")

# Run schema initialization once on import
init_db()

# Legacy MongoDB shim for backwards compatibility
class UsersCollectionShim:
    def find_one(self, filter_dict):
        from backend.controllers.auth_service import find_user_by_filter
        return find_user_by_filter(filter_dict)

    def insert_one(self, doc):
        from backend.controllers.auth_service import insert_user_doc
        return insert_user_doc(doc)

users_collection = UsersCollectionShim()

