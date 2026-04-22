"""Auth business logic: register, login, refresh."""

from fastapi import HTTPException, status
from beanie import PydanticObjectId

from app.data.models import User
from app.auth.utils import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
)


async def register_user(email: str, password: str) -> dict:
    existing = await User.find_one(User.email == email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(email=email, hashed_password=hash_password(password))
    await user.insert()

    return {
        "access_token": create_access_token(str(user.id)),
        "refresh_token": create_refresh_token(str(user.id)),
        "token_type": "bearer",
        "user_id": str(user.id),
        "email": email,
    }


async def login_user(email: str, password: str) -> dict:
    user = await User.find_one(User.email == email)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    return {
        "access_token": create_access_token(str(user.id)),
        "refresh_token": create_refresh_token(str(user.id)),
        "token_type": "bearer",
        "user_id": str(user.id),
        "email": user.email,
    }


async def refresh_tokens(refresh_token: str) -> dict:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload["sub"]
    try:
        user = await User.get(PydanticObjectId(user_id))
    except Exception:
        user = None

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return {
        "access_token": create_access_token(user_id),
        "refresh_token": create_refresh_token(user_id),
        "token_type": "bearer",
        "user_id": user_id,
        "email": user.email,
    }