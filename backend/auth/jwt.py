import hmac
import hashlib
import json
import base64
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt
from ..config.settings import settings

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        pass
    salt = settings.auth_secret[:8]
    expected = hashlib.sha256((plain_password + salt).encode("utf-8")).hexdigest()
    return hmac.compare_digest(expected, hashed_password)

def create_access_token(data: dict, expires_minutes: int = 60) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload.update({"exp": int(expire.timestamp())})
    return jwt.encode(payload, settings.auth_secret, algorithm="HS256")

def verify_access_token(token: str):
    try:
        return jwt.decode(token, settings.auth_secret, algorithms=["HS256"])
    except Exception:
        return None
    
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, body, sig = parts
        signing_input = f"{header}.{body}".encode("utf-8")
        expected_sig = base64.urlsafe_b64encode(hmac.new(settings.auth_secret.encode("utf-8"), signing_input, hashlib.sha256).digest()).decode("utf-8").rstrip("=")
        if not hmac.compare_digest(sig, expected_sig):
            return None
        
        # Decode body
        padding = "=" * (4 - len(body) % 4)
        payload = json.loads(base64.urlsafe_b64decode(body + padding).decode("utf-8"))
        if "exp" in payload and payload["exp"] < datetime.now(timezone.utc).timestamp():
            return None
        return payload
    except Exception:
        return None