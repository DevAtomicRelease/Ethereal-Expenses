"""Expense endpoints: CRUD + batch (MongoDB/Beanie)."""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from beanie import PydanticObjectId

from app.data.models import Transaction, User, VALID_CATEGORIES
from app.data.schemas import (
    ExpenseCreate, ExpenseUpdate, ExpenseListResponse,
    ExpenseBatchCreate, BatchResult,
)
from app.dependencies import get_current_user
from app.core.cache import invalidate_user_cache
from app.core.utils_time import normalize_timestamp
from app.memory.behavioral_memory import mark_stale
from app.workers.tasks import background_rebuild_intelligence
from app.websocket.handler import manager as ws_manager

router = APIRouter(tags=["expenses"])

async def _get_txn_or_404(txn_id: str, user: User) -> Transaction:
    """Safely fetch a transaction by ID with ownership check."""
    try:
        txn = await Transaction.get(PydanticObjectId(txn_id))
    except Exception:
        raise HTTPException(404, "Transaction not found")
    if not txn or txn.user_id != str(user.id) or txn.is_deleted:
        raise HTTPException(404, "Transaction not found")
    return txn



@router.post("/expense", status_code=201)
async def create_expense(
    req: ExpenseCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
):
    ts = normalize_timestamp(req.timestamp)
    uid = str(user.id)

    # Duplicate check
    dup_window = timedelta(seconds=60)
    dup = await Transaction.find_one(
        Transaction.user_id == uid,
        Transaction.amount == float(req.amount),
        Transaction.category == req.category.value,
        Transaction.timestamp >= ts - dup_window,
        Transaction.timestamp <= ts + dup_window,
        Transaction.is_deleted == False,
    )
    if dup:
        raise HTTPException(409, "Duplicate transaction detected")

    txn = Transaction(
        user_id=uid, timestamp=ts, amount=float(req.amount),
        category=req.category.value, description=req.description, source="manual",
    )
    await txn.insert()
    await invalidate_user_cache(uid)
    await mark_stale(uid)

    # Trigger background intelligence rebuild
    background_tasks.add_task(background_rebuild_intelligence, uid)

    # Push WebSocket event
    await ws_manager.send_to_user(uid, "expense_created", {
        "id": str(txn.id), "amount": txn.amount, "category": txn.category,
    })

    return {"id": str(txn.id), "amount": txn.amount, "category": txn.category,
            "timestamp": txn.timestamp.isoformat(), "anomaly_flag": txn.anomaly_flag}


@router.get("/expenses")
async def list_expenses(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=500),
    category: str = Query(None),
    user: User = Depends(get_current_user),
):
    uid = str(user.id)
    query = Transaction.find(Transaction.user_id == uid, Transaction.is_deleted == False)
    if category:
        query = Transaction.find(Transaction.user_id == uid, Transaction.is_deleted == False, Transaction.category == category)

    total = await query.count()
    txns = await query.sort(-Transaction.timestamp).skip((page - 1) * limit).limit(limit).to_list()

    return {
        "transactions": [
            {"id": str(t.id), "amount": t.amount, "category": t.category,
             "description": t.description, "timestamp": t.timestamp.isoformat(),
             "source": t.source, "anomaly_flag": t.anomaly_flag}
            for t in txns
        ],
        "total": total, "page": page, "limit": limit,
    }


@router.get("/expenses/{txn_id}")
async def get_expense(txn_id: str, user: User = Depends(get_current_user)):
    txn = await _get_txn_or_404(txn_id, user)
    return {"id": str(txn.id), "amount": txn.amount, "category": txn.category,
            "description": txn.description, "timestamp": txn.timestamp.isoformat(),
            "source": txn.source, "anomaly_flag": txn.anomaly_flag}


@router.put("/expenses/{txn_id}")
async def update_expense(
    txn_id: str,
    req: ExpenseUpdate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
):
    txn = await _get_txn_or_404(txn_id, user)

    # Block edits on transactions older than 7 days to protect model integrity
    edit_window = timedelta(days=7)
    now = datetime.now(timezone.utc)
    txn_age = now - txn.timestamp.replace(tzinfo=timezone.utc) if txn.timestamp.tzinfo is None else now - txn.timestamp.astimezone(timezone.utc)
    if txn_age > edit_window:
        raise HTTPException(
            403,
            f"Cannot edit transactions older than 7 days. This transaction is {txn_age.days} days old."
        )

    try:
        triggers_rebuild = False
        if req.amount is not None:
            txn.amount = float(req.amount)
            triggers_rebuild = True
        if req.category is not None:
            txn.category = req.category.value
            triggers_rebuild = True
        if req.timestamp is not None:
            txn.timestamp = normalize_timestamp(req.timestamp)
            triggers_rebuild = True
        if req.description is not None:
            txn.description = req.description

        await txn.save()
        uid = str(user.id)
        await invalidate_user_cache(uid)
        if triggers_rebuild:
            await mark_stale(uid)
            background_tasks.add_task(background_rebuild_intelligence, uid)

        # Push WebSocket event
        await ws_manager.send_to_user(uid, "expense_updated", {
            "id": str(txn.id), "amount": txn.amount, "category": txn.category,
        })

        return {"id": str(txn.id), "amount": txn.amount, "category": txn.category,
                "timestamp": txn.timestamp.isoformat()}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(400, f"Invalid data: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Failed to update expense: {str(e)}")


@router.delete("/expenses/{txn_id}")
async def delete_expense(
    txn_id: str,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
):
    txn = await _get_txn_or_404(txn_id, user)

    txn.is_deleted = True
    await txn.save()
    uid = str(user.id)
    await invalidate_user_cache(uid)
    await mark_stale(uid)
    background_tasks.add_task(background_rebuild_intelligence, uid)

    # Push WebSocket event
    await ws_manager.send_to_user(uid, "expense_deleted", {"id": str(txn.id)})

    return {"status": "deleted", "id": str(txn.id)}


@router.post("/expenses/batch", response_model=BatchResult)
async def batch_import(
    req: ExpenseBatchCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
):
    uid = str(user.id)
    imported = 0; duplicates = 0; errors = []
    for i, item in enumerate(req.transactions):
        try:
            ts = normalize_timestamp(item.timestamp)
            dup = await Transaction.find_one(
                Transaction.user_id == uid, Transaction.amount == float(item.amount),
                Transaction.category == item.category.value,
                Transaction.timestamp >= ts - timedelta(seconds=60),
                Transaction.timestamp <= ts + timedelta(seconds=60),
                Transaction.is_deleted == False,
            )
            if dup:
                duplicates += 1; continue
            await Transaction(
                user_id=uid, timestamp=ts, amount=float(item.amount),
                category=item.category.value, description=item.description, source="bank_import",
            ).insert()
            imported += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")
    await invalidate_user_cache(uid)
    await mark_stale(uid)

    # Trigger background rebuild after batch import
    if imported > 0:
        background_tasks.add_task(background_rebuild_intelligence, uid)
        await ws_manager.send_to_user(uid, "batch_imported", {
            "imported": imported, "duplicates": duplicates,
        })

    return {"imported": imported, "duplicates": duplicates, "errors": errors[:20]}