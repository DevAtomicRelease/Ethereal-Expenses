"""Report Service: weekly report JSON (MongoDB)."""

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional

from app.config import settings
from app.data.models import Transaction
from app.core.cache import get_cache, set_cache
from app.core.utils_serialization import make_serializable
from app.services.intelligence_service import run_pipeline


async def get_weekly_report(user_id: str) -> Optional[Dict[str, Any]]:
    uid = str(user_id)
    cached = await get_cache(uid, "report_weekly")
    if cached:
        return cached

    total_txns = await Transaction.find(
        Transaction.user_id == uid, Transaction.is_deleted == False,
    ).count()

    if total_txns < 50:
        return {"status": "unavailable", "reason": f"Need 50+ transactions (have {total_txns})"}

    intel = await run_pipeline(uid)
    if intel.get("status") == "insufficient_data":
        return {"status": "unavailable", "reason": "Insufficient data"}

    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=7)
    week_txns = await Transaction.find(
        Transaction.user_id == uid, Transaction.is_deleted == False,
        Transaction.timestamp >= week_start,
    ).to_list()

    week_total = sum(float(t.amount) for t in week_txns)
    cat_breakdown = {}
    for t in week_txns:
        cat_breakdown[t.category] = cat_breakdown.get(t.category, 0) + float(t.amount)
    if week_total > 0:
        cat_breakdown = {k: round(v / week_total, 3) for k, v in cat_breakdown.items()}

    report = {
        "status": "ready", "report_type": "weekly",
        "generated_at": now.isoformat(),
        "summary": {"total_spend": round(week_total, 2), "transaction_count": len(week_txns), "category_breakdown": cat_breakdown},
        "narrative": intel.get("narrative"),
    }
    await set_cache(uid, "report_weekly", make_serializable(report), settings.CACHE_TTL_REPORT)
    return report
