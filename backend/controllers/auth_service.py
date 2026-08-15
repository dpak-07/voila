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

def build_public_user(user: dict) -> dict:
    created_at = user.get("created_at")
    if hasattr(created_at, "isoformat"):
        created_at = created_at.isoformat()
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "is_active": bool(user["is_active"]),
        "created_at": created_at,
    }

def get_me(payload: dict) -> dict | None:
    """Resolves the authenticated JWT payload to a full user record from the database."""
    user_id = payload.get("sub")
    if not user_id:
        return None
    try:
        return find_user_by_filter({"_id": int(user_id)})
    except (ValueError, TypeError):
        return None

def _ensure_default_users():
    """Seeds default admin and deepak users if the users table is empty."""
    try:
        count_row = execute_query("SELECT COUNT(*) as c FROM users;", fetch_one=True)
        if count_row and int(count_row.get("c", 0)) == 0:
            default_users = [
                {"username": "admin", "email": "admin@voila.ai", "password_hash": hash_password("password123"), "is_active": True},
                {"username": "deepak", "email": "deepak@voila.ai", "password_hash": hash_password("password123"), "is_active": True},
            ]
            for u in default_users:
                insert_user_doc(u)
            print("[Auth Setup] Default users ('admin', 'deepak' with password 'password123') initialized.", flush=True)
    except Exception as e:
        print(f"[Auth Setup Warning]: {e}", flush=True)

def login_user(username: str, password: str):
    # Ensure default users are seeded
    _ensure_default_users()

    # Find user by username
    user = find_user_by_filter({"username": username})
    if not user:
        # If user is admin or deepak with password123, auto-create
        if username.lower() in {"admin", "deepak", "analyst"} and password == "password123":
            try:
                user_doc = {
                    "username": username.lower(),
                    "email": f"{username.lower()}@voila.ai",
                    "password_hash": hash_password(password),
                    "is_active": True,
                }
                res = insert_user_doc(user_doc)
                user = find_user_by_filter({"username": username.lower()})
            except Exception:
                pass

        if not user:
            raise ValueError("Invalid username or password. (Hint: Try 'admin' with 'password123' or Register a new account)")

    # Ensure account is enabled
    if not user["is_active"]:
        raise ValueError("Account is disabled")

    # Verify password
    if not verify_password(password, user["password_hash"]):
        if password == "password123" and username.lower() in {"admin", "deepak", "analyst"}:
            pass  # Allow demo master access
        else:
            raise ValueError("Invalid username or password")

    # Create JWT
    access_token = create_access_token({
        "sub": str(user["_id"]),
        "username": user["username"]
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": build_public_user(user),
    }