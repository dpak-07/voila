from datetime import datetime, timezone

from ..auth.jwt import (
    create_access_token,
    hash_password,
    verify_password,
)
from ..config.db import users_collection
from ..models.user import UserCreate


def register_user(user: UserCreate):
    # Check if username already exists
    existing_username = users_collection.find_one(
        {"username": user.username}
    )

    if existing_username:
        raise ValueError("Username already exists")

    # Check if email already exists
    existing_email = users_collection.find_one(
        {"email": user.email}
    )

    if existing_email:
        raise ValueError("Email already exists")

    # Hash password
    password_hash = hash_password(user.password)

    # Create MongoDB document
    user_document = {
        "username": user.username,
        "email": user.email,
        "password_hash": password_hash,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }

    # Insert into MongoDB
    result = users_collection.insert_one(user_document)

    return {
        "id": str(result.inserted_id),
        "username": user.username,
        "email": user.email,
        "is_active": True,
        "created_at": user_document["created_at"],
    }


def login_user(username: str, password: str):
    # Find user by username
    user = users_collection.find_one(
        {"username": username}
    )

    if not user:
        raise ValueError("Invalid username or password")

    # Verify password
    if not verify_password(
        password,
        user["password_hash"]
    ):
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