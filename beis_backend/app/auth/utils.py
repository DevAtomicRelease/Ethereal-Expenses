"""JWT + BCrypt utilities + token blacklist."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRY_MINUTES)
    return jwt.encode(
        {"sub": user_id, "exp": expire, "type": "access"},
        settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_EXPIRY_DAYS)
    return jwt.encode(
        {"sub": user_id, "exp": expire, "type": "refresh"},
        settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM,
    )


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None


async def is_token_blacklisted(token: str) -> bool:
    """Check if a token has been blacklisted (revoked on logout)."""
    try:
        from app.core.cache import get_redis
        r = await get_redis()
        return await r.exists(f"bl:{token}") > 0
    except Exception:
        return False


async def blacklist_token(token: str, payload: dict) -> None:
    """Add a token to the Redis blacklist. TTL = remaining token lifetime."""
    try:
        from app.core.cache import get_redis
        r = await get_redis()
        exp = payload.get("exp", 0)
        now = datetime.now(timezone.utc).timestamp()
        ttl = max(int(exp - now), 1)
        await r.setex(f"bl:{token}", ttl, "1")
    except Exception:
        pass
