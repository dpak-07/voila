from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

from ..config.settings import settings


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    return pwd_context.verify(
        plain_password,
        hashed_password
    )


def create_access_token(
    data: dict,
    expires_minutes: int = 60
) -> str:
    payload = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes
    )

    payload.update({
        "exp": expire
    })

    return jwt.encode(
        payload,
        settings.auth_secret,
        algorithm="HS256"
    )

def verify_access_token(token: str):
    try:
        payload = jwt.decode(
            token,
            settings.auth_secret,
            algorithms=["HS256"]
        )

        return payload

    except Exception:
        return None