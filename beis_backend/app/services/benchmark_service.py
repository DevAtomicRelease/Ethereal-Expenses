"""
Benchmark Service: anonymized peer comparison.

Aggregates spending patterns across ALL users to produce percentile-based
benchmarks. The current user's spending is compared against the community
averages, broken down by category and overall.

Privacy: No individual user data is exposed — only aggregated statistics.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

from app.config import settings
from app.data.models import Transaction
from app.core.cache import get_cache, set_cache
from app.core.utils_serialization import make_serializable


async def get_benchmarks(user_id: str) -> Dict[str, Any]:
    """
    Returns peer benchmarks comparing the user to anonymized community data.
    Cached for 1 hour (3600s).
    """
    uid = str(user_id)

    # Check cache first
    cached = await get_cache(uid, "benchmarks")
    if cached:
        return cached

    window_start = datetime.now(timezone.utc) - timedelta(days=30)

    # ── Get the current user's 30-day transactions ──────────────────────
    user_txns = await Transaction.find(
        Transaction.user_id == uid,
        Transaction.is_deleted == False,
        Transaction.timestamp >= window_start,
    ).to_list()

    if not user_txns:
        return {
            "has_data": False,
            "message": "Need at least one month of data for benchmarks.",
        }

    user_total = sum(t.amount for t in user_txns)
    user_txn_count = len(user_txns)
    user_avg_txn = user_total / user_txn_count if user_txn_count else 0

    # User's category breakdown (amounts)
    user_cat: Dict[str, float] = {}
    for t in user_txns:
        user_cat[t.category] = user_cat.get(t.category, 0) + t.amount

    # ── Aggregate ALL users' 30-day data (anonymized) ───────────────────
    all_txns = await Transaction.find(
        Transaction.is_deleted == False,
        Transaction.timestamp >= window_start,
    ).to_list()

    if len(all_txns) < 10:
        return {
            "has_data": False,
            "message": "Not enough community data for benchmarks yet.",
        }

    # Group by user_id to compute per-user stats
    user_totals: Dict[str, float] = {}
    user_counts: Dict[str, int] = {}
    user_cats: Dict[str, Dict[str, float]] = {}

    for t in all_txns:
        uid_t = t.user_id
        user_totals[uid_t] = user_totals.get(uid_t, 0) + t.amount
        user_counts[uid_t] = user_counts.get(uid_t, 0) + 1
        if uid_t not in user_cats:
            user_cats[uid_t] = {}
        user_cats[uid_t][t.category] = user_cats[uid_t].get(t.category, 0) + t.amount

    total_users = len(user_totals)
    if total_users < 2:
        return {
            "has_data": False,
            "message": "Need more users for meaningful benchmarks.",
        }

    # ── Compute community statistics ────────────────────────────────────
    all_totals = sorted(user_totals.values())
    community_avg = sum(all_totals) / total_users
    community_median = all_totals[total_users // 2]

    # Percentile rank: what % of users spend MORE than this user
    users_spending_less = sum(1 for t in all_totals if t < user_total)
    percentile = round((users_spending_less / total_users) * 100)

    # ── Category benchmarks ─────────────────────────────────────────────
    # For each category the user spends in, compute community avg
    cat_benchmarks = {}
    for cat, user_amt in user_cat.items():
        cat_amounts = [
            user_cats[u].get(cat, 0) for u in user_cats if cat in user_cats[u]
        ]
        if cat_amounts:
            cat_avg = sum(cat_amounts) / len(cat_amounts)
            diff_pct = ((user_amt - cat_avg) / cat_avg * 100) if cat_avg > 0 else 0
            cat_benchmarks[cat] = {
                "your_spend": round(user_amt, 2),
                "community_avg": round(cat_avg, 2),
                "diff_pct": round(diff_pct, 1),
                "status": "above" if diff_pct > 15 else "below" if diff_pct < -15 else "average",
            }

    # ── Spending intensity (txn frequency comparison) ───────────────────
    all_counts = sorted(user_counts.values())
    community_avg_count = sum(all_counts) / total_users
    freq_diff_pct = ((user_txn_count - community_avg_count) / community_avg_count * 100) if community_avg_count > 0 else 0

    result = {
        "has_data": True,
        "total_users_in_pool": total_users,
        "your_30d_total": round(user_total, 2),
        "community_avg_30d": round(community_avg, 2),
        "community_median_30d": round(community_median, 2),
        "percentile": percentile,  # 0=lowest spender, 100=highest spender
        "vs_community_pct": round(((user_total - community_avg) / community_avg * 100) if community_avg > 0 else 0, 1),
        "category_benchmarks": cat_benchmarks,
        "your_txn_count": user_txn_count,
        "community_avg_txn_count": round(community_avg_count, 1),
        "frequency_diff_pct": round(freq_diff_pct, 1),
    }

    await set_cache(uid, "benchmarks", make_serializable(result), 3600)
    return result
