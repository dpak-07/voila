from datetime import datetime, timezone
from ..auth.jwt import (
    create_access_token,
    hash_password,
    verify_password,
)
from ..config.db import engine, DB_DIALECT
from ..models.user import UserCreate

def find_user_by_filter(filter_dict: dict) -> dict | None:
    """Helper to query user from PostgreSQL/SQL table."""
    try:
        with engine.connect() as conn:
            if "username" in filter_dict:
                sql = "SELECT id, username, email, password_hash, is_active, created_at FROM users WHERE username = :val LIMIT 1"
                row = conn.execute(sql, {"val": filter_dict["username"]}).fetchone()
            elif "email" in filter_dict:
                sql = "SELECT id, username, email, password_hash, is_active, created_at FROM users WHERE email = :val LIMIT 1"
                row = conn.execute(sql, {"val": filter_dict["email"]}).fetchone()
            elif "_id" in filter_dict or "id" in filter_dict:
                val = filter_dict.get("_id") or filter_dict.get("id")
                sql = "SELECT id, username, email, password_hash, is_active, created_at FROM users WHERE id = :val LIMIT 1"
                row = conn.execute(sql, {"val": int(val)}).fetchone()
            else:
                return None

            if row:
                return {
                    "_id": str(row[0]),
                    "id": row[0],
                    "username": row[1],
                    "email": row[2],
                    "password_hash": row[3],
                    "is_active": bool(row[4]),
                    "created_at": row[5]
                }
    except Exception as e:
        print(f"[Auth DB Warning]: {e}")
    return None

def insert_user_doc(doc: dict) -> dict:
    """Helper to insert user into PostgreSQL/SQL table."""
    with engine.connect() as conn:
        sql = """
            INSERT INTO users (username, email, password_hash, is_active, created_at)
            VALUES (:username, :email, :password_hash, :is_active, :created_at)
        """
        created_at = doc.get("created_at") or datetime.now(timezone.utc).isoformat()
        conn.execute(sql, {
            "username": doc["username"],
            "email": doc["email"],
            "password_hash": doc["password_hash"],
            "is_active": 1 if doc.get("is_active", True) else 0,
            "created_at": str(created_at)
        })
        conn.commit()
        
        # Get inserted ID
        id_sql = "SELECT id FROM users WHERE username = :username"
        row = conn.execute(id_sql, {"username": doc["username"]}).fetchone()
        inserted_id = row[0] if row else 1

    class InsertResult:
        def __init__(self, iid):
            self.inserted_id = str(iid)

    return InsertResult(inserted_id)

def register_user(user: UserCreate):
    # Check if username already exists
    existing_username = find_user_by_filter({"username": user.username})
    if existing_username:
        raise ValueError("Username already exists")

    # Check if email already exists
    existing_email = find_user_by_filter({"email": user.email})
    if existing_email:
        raise ValueError("Email already exists")

    # Hash password
    password_hash = hash_password(user.password)

    # Insert into PostgreSQL
    user_document = {
        "username": user.username,
        "email": user.email,
        "password_hash": password_hash,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = insert_user_doc(user_document)

    return {
        "id": str(result.inserted_id),
        "username": user.username,
        "email": user.email,
        "is_active": True,
        "created_at": user_document["created_at"],
    }

def login_user(username: str, password: str):
    # Find user by username
    user = find_user_by_filter({"username": username})
    if not user:
        raise ValueError("Invalid username or password")

    # Verify password
    if not verify_password(password, user["password_hash"]):
        raise ValueError("Invalid username or password")

    # Create JWT
    access_token = create_access_token({
        "sub": str(user["_id"]),
        "username": user["username"]
    })

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }