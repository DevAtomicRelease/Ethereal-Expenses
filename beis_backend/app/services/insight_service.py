"""Insight Service: statistical summaries without LLM (MongoDB)."""

import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import Dict, Any

from app.config import settings
from app.data.models import Transaction
from app.core.cache import get_cache, set_cache
from app.core.utils_serialization import make_serializable


async def get_insights(user_id: str) -> Dict[str, Any]:
    uid = str(user_id)
    cached = await get_cache(uid, "insights")
    if cached:
        return cached

    window_start = datetime.now(timezone.utc) - timedelta(days=settings.ANALYSIS_WINDOW_DAYS)
    txns = await Transaction.find(
        Transaction.user_id == uid,
        Transaction.is_deleted == False,
        Transaction.timestamp >= window_start,
    ).sort(-Transaction.timestamp).to_list()

    if not txns:
        return {"category_breakdown": {}, "weekly_averages": {}, "time_pattern": {},
                "total_spend_90d": 0.0, "txn_count_90d": 0, "data_maturity": "insufficient"}

    df = pd.DataFrame([{"timestamp": t.timestamp, "amount": float(t.amount), "category": t.category} for t in txns])
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

    total = df["amount"].sum()
    cat_breakdown = {}
    if total > 0:
        for cat, amt in df.groupby("category")["amount"].sum().items():
            cat_breakdown[cat] = round(amt / total, 3)

    df["week"] = df["timestamp"].dt.isocalendar().week.astype(int)
    weekly = {str(w): round(float(v), 2) for w, v in df.groupby("week")["amount"].sum().items()}

    def _slot(h):
        if 5 <= h < 12: return "morning"
        elif 12 <= h < 17: return "afternoon"
        elif 17 <= h < 21: return "evening"
        elif 21 <= h < 24: return "night"
        else: return "late_night"

    time_counts = df["timestamp"].dt.hour.apply(_slot).value_counts(normalize=True)
    time_pattern = {s: round(float(time_counts.get(s, 0)), 2) for s in ["morning", "afternoon", "evening", "night", "late_night"]}

    n = len(txns)
    maturity = "insufficient" if n < 15 else "early" if n < 50 else "developing" if n < 150 else "mature"

    insights = {
        "category_breakdown": cat_breakdown, "weekly_averages": weekly,
        "time_pattern": time_pattern, "total_spend_90d": round(float(total), 2),
        "txn_count_90d": n, "data_maturity": maturity,
    }
    await set_cache(uid, "insights", make_serializable(insights), settings.CACHE_TTL_INSIGHTS)
    return insights
