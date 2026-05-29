"""
BEIS v3.0 Beanie Document Models
==================================
5 MongoDB collections. Each class is both a Pydantic model AND a DB document.
ObjectId serialized to string via model_config json_encoders.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional

from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field


VALID_CATEGORIES = {
    "food", "transport", "entertainment", "shopping", "groceries",
    "health", "education", "utilities", "rent", "subscriptions",
    "travel", "alcohol", "dining_out", "coffee", "personal_care",
    "electronics", "clothing", "gifts", "charity", "fitness",
    "fuel", "insurance", "emi", "recharge", "misc",
}

VALID_SOURCES = {"manual", "receipt_scan", "bank_import", "plaid"}


class User(Document):
    email: Indexed(str, unique=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    currency: str = "INR"
    preferences: Dict = Field(default_factory=dict)

    class Settings:
        name = "users"
        # Fix 7: ObjectId -> str in JSON responses
        json_encoders = {PydanticObjectId: str}

    model_config = {"json_encoders": {PydanticObjectId: str}}


class Transaction(Document):
    user_id: Indexed(str)
    timestamp: datetime
    amount: float
    category: str
    description: Optional[str] = None
    source: str = "manual"
    mood: Optional[str] = None  # happy, neutral, stressed, frustrated, tired
    anomaly_flag: bool = False
    is_deleted: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "transactions"
        indexes = [[("user_id", 1), ("timestamp", -1)]]
        json_encoders = {PydanticObjectId: str}

    model_config = {"json_encoders": {PydanticObjectId: str}}


class BehavioralMemory(Document):
    user_id: Indexed(str, unique=True)
    version_hash: str = ""
    is_stale: bool = True
    built_at: Optional[datetime] = None
    window_days: int = 90
    memory_payload: Dict = Field(default_factory=dict)
    baseline_full: Dict = Field(default_factory=dict)

    class Settings:
        name = "behavioral_memory"
        json_encoders = {PydanticObjectId: str}

    model_config = {"json_encoders": {PydanticObjectId: str}}


class IntelligenceResult(Document):
    user_id: Indexed(str)
    narrative: str
    reasoning: Optional[str] = None
    signals: Dict = Field(default_factory=dict)
    data_maturity: str = "insufficient"
    signal_confidence: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "intelligence_history"
        indexes = [[("created_at", 1)]]
        json_encoders = {PydanticObjectId: str}

    model_config = {"json_encoders": {PydanticObjectId: str}}


class AnomalyLog(Document):
    user_id: Indexed(str)
    transaction_id: Optional[str] = None
    severity: str = "mild"
    anomaly_type: str = ""
    explanation: str = ""
    detected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "anomaly_logs"
        indexes = [[("detected_at", 1)]]
        json_encoders = {PydanticObjectId: str}

    model_config = {"json_encoders": {PydanticObjectId: str}}


class SplitExpense(Document):
    """Tracks a shared expense between the user and contacts."""
    user_id: Indexed(str)
    transaction_id: Optional[str] = None
    title: str
    total_amount: float
    your_share: float = 0.0
    category: str = "misc"
    participants: List[Dict] = Field(default_factory=list)
    # Each participant: {"name": str, "share": float, "settled": bool}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_settled: bool = False

    class Settings:
        name = "split_expenses"
        indexes = [[("user_id", 1), ("created_at", -1)]]
        json_encoders = {PydanticObjectId: str}

    model_config = {"json_encoders": {PydanticObjectId: str}}
