"""Recurring expenses detection + Split expenses CRUD."""

from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId
from pydantic import BaseModel, Field

from app.data.models import Transaction, User, SplitExpense
from app.dependencies import get_current_user
from app.core.cache import invalidate_user_cache

router = APIRouter(tags=["features"])


# ═══════════════════════════════════════════════════════════════════════════════
# RECURRING EXPENSES DETECTION
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/recurring")
async def detect_recurring(user: User = Depends(get_current_user)):
    """
    Analyze transaction history to find recurring expenses.
    Looks for same description+amount appearing at regular intervals.
    """
    uid = str(user.id)
    cutoff = datetime.now(timezone.utc) - timedelta(days=180)

    txns = await Transaction.find(
        Transaction.user_id == uid,
        Transaction.is_deleted == False,
        Transaction.timestamp >= cutoff,
    ).sort("+timestamp").to_list()

    if len(txns) < 5:
        return {"recurring": [], "total_monthly": 0, "total_annual": 0, "count": 0}

    # Group by normalized description + similar amount
    groups: Dict[str, list] = defaultdict(list)
    for t in txns:
        desc = (t.description or "").strip().lower()
        if not desc or len(desc) < 3:
            continue
        key = f"{desc}|{round(t.amount / 10) * 10}"
        groups[key].append(t)

    recurring = []
    for key, items in groups.items():
        if len(items) < 2:
            continue

        dates = sorted([t.timestamp for t in items])
        intervals = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
        avg_interval = sum(intervals) / len(intervals) if intervals else 0

        if avg_interval < 5 or avg_interval > 95:
            continue

        variance = sum((i - avg_interval)**2 for i in intervals) / len(intervals)
        std_dev = variance ** 0.5
        if avg_interval > 0 and (std_dev / avg_interval) > 0.45:
            continue

        if avg_interval <= 10:
            frequency = "weekly"
            monthly_cost = items[-1].amount * 4
        elif avg_interval <= 20:
            frequency = "bi-weekly"
            monthly_cost = items[-1].amount * 2
        elif avg_interval <= 40:
            frequency = "monthly"
            monthly_cost = items[-1].amount
        elif avg_interval <= 70:
            frequency = "bi-monthly"
            monthly_cost = items[-1].amount / 2
        else:
            frequency = "quarterly"
            monthly_cost = items[-1].amount / 3

        last_date = dates[-1]
        next_expected = last_date + timedelta(days=round(avg_interval))

        recurring.append({
            "description": items[-1].description,
            "amount": items[-1].amount,
            "category": items[-1].category,
            "frequency": frequency,
            "avg_interval_days": round(avg_interval),
            "occurrences": len(items),
            "monthly_cost": round(monthly_cost),
            "annual_cost": round(monthly_cost * 12),
            "last_date": last_date.isoformat(),
            "next_expected": next_expected.isoformat(),
        })

    recurring.sort(key=lambda r: r["monthly_cost"], reverse=True)
    total_monthly = sum(r["monthly_cost"] for r in recurring)

    return {
        "recurring": recurring,
        "total_monthly": total_monthly,
        "total_annual": total_monthly * 12,
        "count": len(recurring),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SPLIT EXPENSES
# ═══════════════════════════════════════════════════════════════════════════════

class ParticipantSchema(BaseModel):
    name: str
    share: float = Field(..., gt=0)
    settled: bool = False


class SplitCreate(BaseModel):
    title: str = Field(..., max_length=200)
    total_amount: float = Field(..., gt=0)
    your_share: float = Field(..., ge=0, description="How much the account holder paid/contributed")
    category: str = "misc"
    transaction_id: Optional[str] = None
    participants: List[ParticipantSchema]
    record_transaction: bool = Field(True, description="Whether to record your share as a transaction")


class SettleParticipant(BaseModel):
    name: str


def _serialize_split(s: SplitExpense) -> dict:
    """Convert a SplitExpense document to a JSON-safe dict."""
    others_total = sum(p["share"] for p in s.participants)
    owed_to_you = sum(p["share"] for p in s.participants if not p.get("settled"))
    settled_amount = sum(p["share"] for p in s.participants if p.get("settled"))
    return {
        "id": str(s.id),
        "title": s.title,
        "total_amount": s.total_amount,
        "your_share": s.your_share,
        "category": s.category,
        "participants": s.participants,
        "others_total": round(others_total, 2),
        "owed_to_you": round(owed_to_you, 2),
        "settled_amount": round(settled_amount, 2),
        "is_settled": s.is_settled,
        "transaction_id": s.transaction_id,
        "created_at": s.created_at.isoformat(),
    }


@router.get("/splits")
async def list_splits(
    settled: Optional[bool] = None,
    user: User = Depends(get_current_user),
):
    """List all split expenses for the user."""
    uid = str(user.id)
    filters = [SplitExpense.user_id == uid]
    if settled is not None:
        filters.append(SplitExpense.is_settled == settled)

    splits = await SplitExpense.find(*filters).sort("-created_at").to_list()
    result = [_serialize_split(s) for s in splits]
    total_owed = sum(r["owed_to_you"] for r in result)
    total_you_spent = sum(r["your_share"] for r in result)

    return {
        "splits": result,
        "total_owed": round(total_owed, 2),
        "total_you_spent": round(total_you_spent, 2),
        "count": len(result),
    }


@router.post("/splits", status_code=201)
async def create_split(
    req: SplitCreate,
    user: User = Depends(get_current_user),
):
    """Create a new split expense. Optionally records user's share as a transaction."""
    uid = str(user.id)
    participants = [p.model_dump() for p in req.participants]

    # Validate: your_share + others' shares should equal total
    others_total = sum(p["share"] for p in participants)
    if abs((req.your_share + others_total) - req.total_amount) > 1:
        raise HTTPException(
            400,
            f"Shares don't add up: your share ({req.your_share}) + "
            f"others ({others_total}) = {req.your_share + others_total}, "
            f"but total is {req.total_amount}"
        )

    txn_id = req.transaction_id

    # Record user's share as a transaction if requested
    if req.record_transaction and req.your_share > 0:
        txn = Transaction(
            user_id=uid,
            timestamp=datetime.now(timezone.utc),
            amount=req.your_share,
            category=req.category,
            description=f"Split: {req.title}",
            source="manual",
        )
        await txn.insert()
        txn_id = str(txn.id)
        await invalidate_user_cache(uid)

    split = SplitExpense(
        user_id=uid,
        title=req.title,
        total_amount=req.total_amount,
        your_share=req.your_share,
        category=req.category,
        transaction_id=txn_id,
        participants=participants,
    )
    await split.insert()
    return {"id": str(split.id), "transaction_id": txn_id, "status": "created"}


@router.put("/splits/{split_id}/settle")
async def settle_participant(
    split_id: str,
    req: SettleParticipant,
    user: User = Depends(get_current_user),
):
    """Mark a participant as settled in a split expense."""
    uid = str(user.id)
    try:
        split = await SplitExpense.get(PydanticObjectId(split_id))
    except Exception:
        raise HTTPException(404, "Split not found")
    if not split or split.user_id != uid:
        raise HTTPException(404, "Split not found")

    found = False
    for p in split.participants:
        if p["name"].lower() == req.name.lower():
            p["settled"] = True
            found = True
            break
    if not found:
        raise HTTPException(404, f"Participant '{req.name}' not found")

    all_settled = all(p.get("settled") for p in split.participants)
    split.is_settled = all_settled
    await split.save()

    return {"status": "settled", "is_fully_settled": all_settled, "split": _serialize_split(split)}


@router.delete("/splits/{split_id}")
async def delete_split(
    split_id: str,
    user: User = Depends(get_current_user),
):
    """Delete a split expense."""
    uid = str(user.id)
    try:
        split = await SplitExpense.get(PydanticObjectId(split_id))
    except Exception:
        raise HTTPException(404, "Split not found")
    if not split or split.user_id != uid:
        raise HTTPException(404, "Split not found")
    await split.delete()
    return {"status": "deleted"}
