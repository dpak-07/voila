from datetime import datetime, timezone
from ..auth.jwt import (
    create_access_token,
    hash_password,
    verify_password,
)
from ..config.db import execute_query
from ..models.user import UserCreate

def find_user_by_filter(filter_dict: dict) -> dict | None:
    """Helper to query user from PostgreSQL users table."""
    try:
        if "username" in filter_dict:
            sql = "SELECT id, username, email, password_hash, is_active, created_at FROM users WHERE username = %s LIMIT 1;"
            row = execute_query(sql, (filter_dict["username"],), fetch_one=True)
        elif "email" in filter_dict:
            sql = "SELECT id, username, email, password_hash, is_active, created_at FROM users WHERE email = %s LIMIT 1;"
            row = execute_query(sql, (filter_dict["email"],), fetch_one=True)
        elif "_id" in filter_dict or "id" in filter_dict:
            val = filter_dict.get("_id") or filter_dict.get("id")
            sql = "SELECT id, username, email, password_hash, is_active, created_at FROM users WHERE id = %s LIMIT 1;"
            row = execute_query(sql, (int(val),), fetch_one=True)
        else:
            return None

        if row:
            return {
                "_id": str(row["id"]),
                "id": row["id"],
                "username": row["username"],
                "email": row["email"],
                "password_hash": row["password_hash"],
                "is_active": bool(row["is_active"]),
                "created_at": row["created_at"]
            }
    except Exception as e:
        print(f"[Auth DB Warning]: {e}", flush=True)
    return None

def insert_user_doc(doc: dict) -> dict:
    """Helper to insert user into PostgreSQL users table."""
    sql = """
    INSERT INTO users (username, email, password_hash, is_active, created_at)
    VALUES (%s, %s, %s, %s, %s)
    RETURNING id;
    """
    created_at = doc.get("created_at") or datetime.now(timezone.utc).isoformat()
    row = execute_query(
        sql, 
        (doc["username"], doc["email"], doc["password_hash"], bool(doc.get("is_active", True)), created_at),
        fetch_one=True,
        commit=True
    )
    inserted_id = row["id"] if row and "id" in row else 1

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