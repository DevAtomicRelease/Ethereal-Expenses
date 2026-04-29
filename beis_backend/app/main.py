"""
AtomicShift v3.0 -- FastAPI Application
===================================
MongoDB Atlas + Redis + NVIDIA NIM API.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.data.database import init_db, close_db
from app.core.cache import get_redis, close_redis
from app.core.model import check_llm_health

from app.auth.router import router as auth_router
from app.routers.expenses import router as expenses_router
from app.routers.intelligence import router as intelligence_router
from app.routers.memory import router as memory_router
from app.routers.reports import router as reports_router
from app.routers.chat import router as chat_router
from app.websocket.handler import websocket_endpoint


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[STARTUP] Connecting to MongoDB Atlas...")
    try:
        await init_db()
        print(f"[STARTUP] MongoDB OK (db: {settings.DB_NAME})")
    except Exception as e:
        print(f"[STARTUP] MongoDB FAILED: {e}")

    print("[STARTUP] Connecting to Redis...")
    try:
        r = await get_redis()
        await r.ping()
        print("[STARTUP] Redis OK")
    except Exception as e:
        print(f"[STARTUP] Redis unavailable: {e}")

    print(f"[STARTUP] Checking NVIDIA API ({settings.NVIDIA_MODEL})...")
    if await check_llm_health():
        print("[STARTUP] NVIDIA API OK")
    else:
        print(f"[STARTUP] NVIDIA API unavailable")

    print("[STARTUP] ================================")
    print("[STARTUP] AtomicShift v3.0 ready")
    print(f"[STARTUP] DB:    MongoDB Atlas ({settings.DB_NAME})")
    print(f"[STARTUP] Cache: Redis (localhost)")
    print(f"[STARTUP] LLM:   NVIDIA NIM ({settings.NVIDIA_MODEL})")
    print("[STARTUP] ================================")
    yield
    await close_db()
    await close_redis()
    print("[SHUTDOWN] AtomicShift v3.0 stopped")


app = FastAPI(title="AtomicShift v3.0 API", version="3.0.0", lifespan=lifespan)

if settings.cors_origin_list == ["*"]:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )

app.include_router(auth_router)
app.include_router(expenses_router)
app.include_router(intelligence_router)
app.include_router(memory_router)
app.include_router(reports_router)
app.include_router(chat_router)
app.websocket("/ws")(websocket_endpoint)


@app.exception_handler(Exception)
async def global_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        },
    )


@app.get("/health", tags=["system"])
async def health():
    redis_ok = False
    try:
        r = await get_redis()
        await r.ping()
        redis_ok = True
    except Exception:
        pass
    return {"status": "healthy", "version": "3.0.0", "database": "mongodb_atlas",
            "redis": redis_ok, "llm": await check_llm_health(), "model": settings.NVIDIA_MODEL}
