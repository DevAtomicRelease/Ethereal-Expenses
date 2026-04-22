"""
Behavioral Memory (Beanie/MongoDB)
====================================
One document per user. Rebuild on stale flag.
"""

import hashlib
import json
from datetime import datetime, timezone
from typing import Optional

from app.data.models import BehavioralMemory, Transaction
from app.core.utils_serialization import make_serializable


async def load_memory(user_id: str) -> Optional[dict]:
    mem = await BehavioralMemory.find_one(BehavioralMemory.user_id == user_id)
    if mem is None:
        return None
    return mem.memory_payload


async def save_memory(user_id: str, memory_data: dict, version_hash: str):
    serializable = make_serializable(memory_data)
    mem = await BehavioralMemory.find_one(BehavioralMemory.user_id == user_id)
    if mem is None:
        mem = BehavioralMemory(
            user_id=user_id,
            memory_payload=serializable,
            version_hash=version_hash,
            is_stale=False,
            built_at=datetime.now(timezone.utc),
        )
        await mem.insert()
    else:
        mem.memory_payload = serializable
        mem.version_hash = version_hash
        mem.is_stale = False
        mem.built_at = datetime.now(timezone.utc)
        await mem.save()


async def mark_stale(user_id: str):
    mem = await BehavioralMemory.find_one(BehavioralMemory.user_id == user_id)
    if mem:
        mem.is_stale = True
        await mem.save()


async def is_stale(user_id: str) -> bool:
    mem = await BehavioralMemory.find_one(BehavioralMemory.user_id == user_id)
    if mem is None:
        return True
    return mem.is_stale


async def clear_memory(user_id: str):
    mem = await BehavioralMemory.find_one(BehavioralMemory.user_id == user_id)
    if mem:
        await mem.delete()


async def get_status(user_id: str) -> dict:
    mem = await BehavioralMemory.find_one(BehavioralMemory.user_id == user_id)
    txn_count = await Transaction.find(
        Transaction.user_id == user_id,
        Transaction.is_deleted == False,
    ).count()

    if txn_count < 15:
        maturity = "insufficient"
    elif txn_count < 50:
        maturity = "early"
    elif txn_count < 150:
        maturity = "developing"
    else:
        maturity = "mature"

    return {
        "data_maturity": maturity,
        "txn_count": txn_count,
        "window_start": None,
        "version_hash": mem.version_hash if mem else "",
        "is_stale": mem.is_stale if mem else True,
    }


def compute_version_hash(transactions: list) -> str:
    sorted_ids = sorted([str(t.get("id", t.get("timestamp", ""))) for t in transactions])
    content = json.dumps(sorted_ids, sort_keys=True)
    return hashlib.sha256(content.encode()).hexdigest()[:16]
