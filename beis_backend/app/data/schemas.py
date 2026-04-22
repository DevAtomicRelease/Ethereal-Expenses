"""
BEIS v3.0 Pydantic Schemas
============================
Request/response models for API endpoints.
Beanie Document classes handle persistence directly.

FIX: Decimal with max_digits/decimal_places is not supported in Pydantic v2 Field().
     Using float with gt/le constraints instead. MongoDB stores as float anyway.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── Category Enum (25 values) ──
class CategoryEnum(str, Enum):
    food = "food"
    transport = "transport"
    entertainment = "entertainment"
    shopping = "shopping"
    groceries = "groceries"
    health = "health"
    education = "education"
    utilities = "utilities"
    rent = "rent"
    subscriptions = "subscriptions"
    travel = "travel"
    alcohol = "alcohol"
    dining_out = "dining_out"
    coffee = "coffee"
    personal_care = "personal_care"
    electronics = "electronics"
    clothing = "clothing"
    gifts = "gifts"
    charity = "charity"
    fitness = "fitness"
    fuel = "fuel"
    insurance = "insurance"
    emi = "emi"
    recharge = "recharge"
    misc = "misc"


# ── Expenses ──

class ExpenseCreate(BaseModel):
    amount: float = Field(..., gt=0, le=9999999, description="Amount in INR, positive")
    category: CategoryEnum
    description: Optional[str] = Field(None, max_length=500)
    timestamp: str


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0, le=9999999)
    category: Optional[CategoryEnum] = None
    description: Optional[str] = Field(None, max_length=500)
    timestamp: Optional[str] = None


class ExpenseBatchCreate(BaseModel):
    transactions: List[ExpenseCreate]


class BatchResult(BaseModel):
    imported: int
    duplicates: int
    errors: List[str] = []


class ExpenseListResponse(BaseModel):
    transactions: List[Dict[str, Any]]
    total: int
    page: int
    limit: int


# ── Intelligence ──

class InsightResponse(BaseModel):
    category_breakdown: Dict[str, float]
    weekly_averages: Dict[str, float]
    time_pattern: Dict[str, float]
    total_spend_90d: float
    txn_count_90d: int
    data_maturity: str


class MemoryStatusResponse(BaseModel):
    data_maturity: str
    txn_count: int
    window_start: Optional[str] = None
    version_hash: str
    is_stale: bool


class RebuildResponse(BaseModel):
    status: str
    new_version_hash: str
    txn_count: int