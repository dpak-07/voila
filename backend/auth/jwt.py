import hmac
import hashlib
import json
import base64
from datetime import datetime, timedelta, timezone

try:
    from jose import jwt
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    USE_JOSE = True
except ImportError:
    USE_JOSE = False

from ..config.settings import settings

def hash_password(password: str) -> str:
    if USE_JOSE:
        return pwd_context.hash(password)
    # Standard library fallback SHA-256 with salt
    salt = settings.auth_secret[:8]
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if USE_JOSE:
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            pass
    salt = settings.auth_secret[:8]
    expected = hashlib.sha256((plain_password + salt).encode("utf-8")).hexdigest()
    return hmac.compare_digest(expected, hashed_password)

def create_access_token(data: dict, expires_minutes: int = 60) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload.update({"exp": int(expire.timestamp())})

    if USE_JOSE:
        return jwt.encode(payload, settings.auth_secret, algorithm="HS256")
    
    # Standard library JWT encoder fallback
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode("utf-8")).decode("utf-8").rstrip("=")
    body = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8").rstrip("=")
    signing_input = f"{header}.{body}".encode("utf-8")
    signature = base64.urlsafe_b64encode(hmac.new(settings.auth_secret.encode("utf-8"), signing_input, hashlib.sha256).digest()).decode("utf-8").rstrip("=")
    return f"{header}.{body}.{signature}"

def verify_access_token(token: str):
    if USE_JOSE:
        try:
            return jwt.decode(token, settings.auth_secret, algorithms=["HS256"])
        except Exception:
            pass
    
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