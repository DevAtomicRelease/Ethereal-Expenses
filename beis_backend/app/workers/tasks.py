"""
Background Tasks (FastAPI native)
===================================
Replaces Celery. Uses FastAPI BackgroundTasks for async-safe execution.
Motor/Beanie are async-native -- Celery's sync context caused RuntimeError.
"""

from fastapi import BackgroundTasks

from app.services.intelligence_service import run_pipeline
from app.memory.behavioral_memory import mark_stale
from app.core.cache import invalidate_user_cache


async def background_rebuild_intelligence(user_id: str):
    """Background task: run full intelligence pipeline after mutation."""
    try:
        await run_pipeline(user_id)
    except Exception as e:
        import logging
        logging.getLogger("beis.tasks").error(f"Background intelligence failed for {user_id}: {e}")


async def background_rebuild_memory(user_id: str):
    """Background task: mark memory stale + invalidate cache."""
    try:
        await mark_stale(user_id)
        await invalidate_user_cache(user_id)
    except Exception as e:
        import logging
        logging.getLogger("beis.tasks").error(f"Background memory rebuild failed for {user_id}: {e}")
