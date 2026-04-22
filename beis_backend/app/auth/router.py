"""Auth endpoints."""

from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth.schemas import RegisterRequest, LoginRequest, RefreshRequest, TokenResponse
from app.auth.service import register_user, login_user, refresh_tokens
from app.auth.utils import blacklist_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    return await register_user(req.email, req.password)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    return await login_user(req.email, req.password)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(req: RefreshRequest):
    return await refresh_tokens(req.refresh_token)


@router.delete("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Invalidate the current access token by adding it to the Redis blacklist."""
    if credentials and credentials.credentials:
        token = credentials.credentials
        payload = decode_token(token)
        if payload:
            # Blacklist the token for its remaining TTL
            await blacklist_token(token, payload)
    return {"status": "logged_out"}
