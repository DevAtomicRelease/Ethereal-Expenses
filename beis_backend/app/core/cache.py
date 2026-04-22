"""Redis wrapper: get/set/invalidate per-endpoint TTLs."""

import json
from typing import Optional

import redis.asyncio as aioredis

from app.config import settings

_redis: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


async def close_redis():
    global _redis
    if _redis:
        await _redis.close()
        _redis = None


async def get_cache(user_id: str, endpoint: str) -> Optional[dict]:
    try:
        r = await get_redis()
        key = f"beis:{user_id}:{endpoint}"
        raw = await r.get(key)
        return json.loads(raw) if raw else None
    except Exception:
        return None


async def set_cache(user_id: str, endpoint: str, data: dict, ttl: int):
    try:
        r = await get_redis()
        key = f"beis:{user_id}:{endpoint}"
        await r.setex(key, ttl, json.dumps(data, default=str))
    except Exception:
        pass


async def invalidate_user_cache(user_id: str):
    try:
        r = await get_redis()
        pattern = f"beis:{user_id}:*"
        keys = []
        async for key in r.scan_iter(match=pattern):
            keys.append(key)
        if keys:
            await r.delete(*keys)
    except Exception:
        pass
