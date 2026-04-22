"""
MongoDB Connection + Beanie Initialization
============================================
Motor async client connects to Atlas.
Beanie initializes document models on startup.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.config import settings

# Motor client (created once, reused across app)
motor_client: AsyncIOMotorClient = None


async def init_db():
    """
    Initialize Motor client + Beanie ODM.
    Called once on FastAPI startup.
    Creates collections and indexes automatically.
    """
    global motor_client

    motor_client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = motor_client[settings.DB_NAME]

    # Import all Beanie document models
    from app.data.models import (
        User, Transaction, BehavioralMemory,
        IntelligenceResult, AnomalyLog,
    )

    await init_beanie(
        database=db,
        document_models=[
            User, Transaction, BehavioralMemory,
            IntelligenceResult, AnomalyLog,
        ],
    )


async def close_db():
    """Close Motor client on shutdown."""
    global motor_client
    if motor_client:
        motor_client.close()


def get_motor_db():
    """Get the Motor database instance."""
    return motor_client[settings.DB_NAME]
