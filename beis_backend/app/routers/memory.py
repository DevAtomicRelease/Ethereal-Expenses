"""Memory endpoints (Beanie)."""

from fastapi import APIRouter, Depends

from app.data.models import User
from app.data.schemas import MemoryStatusResponse, RebuildResponse
from app.dependencies import get_current_user
from app.memory import behavioral_memory as memory_mod
from app.core.cache import invalidate_user_cache

router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("/status", response_model=MemoryStatusResponse)
async def memory_status(user: User = Depends(get_current_user)):
    return await memory_mod.get_status(str(user.id))


@router.post("/rebuild", response_model=RebuildResponse)
async def rebuild_memory(user: User = Depends(get_current_user)):
    uid = str(user.id)
    await memory_mod.mark_stale(uid)
    await invalidate_user_cache(uid)
    status = await memory_mod.get_status(uid)
    return {"status": "rebuild_queued", "new_version_hash": status["version_hash"], "txn_count": status["txn_count"]}
