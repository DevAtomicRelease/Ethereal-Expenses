"""
Test Fixtures (v3.0 -- mongomock-motor)
=========================================
Uses mongomock_motor for async MongoDB mocking.
Beanie initialized against in-memory mock.
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient
from beanie import init_beanie

from app.data.models import (
    User, Transaction, BehavioralMemory,
    IntelligenceResult, AnomalyLog,
)
from app.auth.utils import hash_password, create_access_token
from app.main import app


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Initialize Beanie with mongomock for each test."""
    client = AsyncMongoMockClient()
    db = client["test_beis_db"]
    await init_beanie(
        database=db,
        document_models=[User, Transaction, BehavioralMemory, IntelligenceResult, AnomalyLog],
    )
    yield
    # Clean up all collections after each test
    for model in [User, Transaction, BehavioralMemory, IntelligenceResult, AnomalyLog]:
        await model.find_all().delete()


@pytest_asyncio.fixture
async def client():
    """Async HTTP client for testing API endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def test_user():
    """Create a test user and return (user, access_token)."""
    user = User(email="test@example.com", hashed_password=hash_password("testpass123"))
    await user.insert()
    token = create_access_token(str(user.id))
    return user, token


@pytest_asyncio.fixture
async def auth_headers(test_user):
    """Return headers with valid JWT."""
    _, token = test_user
    return {"Authorization": f"Bearer {token}"}
