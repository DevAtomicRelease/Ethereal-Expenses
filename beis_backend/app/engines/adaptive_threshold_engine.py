"""
Adaptive Threshold Engine
==========================
Generates personalized daily/weekly/monthly INR limits from the user's
90-day behavioral baseline. Tightens proportionally to risk score.
Architecture v2.0 Section 5.2 Step 11.
"""

import pandas as pd
import numpy as np
from typing import Any, Dict
from datetime import timedelta


def run(
    df: pd.DataFrame,
    brain: Dict[str, Any],
    risk: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Compute adaptive spending thresholds.

    Thresholds = baseline spending + buffer, tightened by risk score.
    Higher risk = tighter thresholds (less headroom).
    """
    if len(df) < 10:
        return _default_thresholds()

    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["date"] = df["timestamp"].dt.date
    amounts = df["amount"].astype(float)

    # ── Daily baseline ──
    daily_totals = df.groupby("date")["amount"].sum().astype(float)
    daily_mean = float(daily_totals.mean()) if len(daily_totals) > 0 else 0
    daily_std = float(daily_totals.std()) if len(daily_totals) > 1 else 0

    # ── Weekly baseline ──
    df["week"] = df["timestamp"].dt.isocalendar().week.astype(int)
    weekly_totals = df.groupby("week")["amount"].sum().astype(float)
    weekly_mean = float(weekly_totals.mean()) if len(weekly_totals) > 0 else 0

    # ── Monthly baseline ──
    df["month"] = df["timestamp"].dt.strftime("%Y-%m")
    monthly_totals = df.groupby("month")["amount"].sum().astype(float)
    monthly_mean = float(monthly_totals.mean()) if len(monthly_totals) > 0 else 0

    # ── Risk-adjusted buffer ──
    # risk_score 0 = 1.8x buffer, risk_score 100 = 1.1x buffer
    risk_score = risk.get("risk_score", 30)
    buffer_mult = 1.8 - (risk_score / 100) * 0.7  # Linear: 1.8 → 1.1

    daily_threshold = round(daily_mean * buffer_mult, 0)
    weekly_threshold = round(weekly_mean * buffer_mult, 0)
    monthly_threshold = round(monthly_mean * buffer_mult, 0)

    # ── Per-category limits ──
    cat_totals = df.groupby("category")["amount"].sum().astype(float)
    cat_days = max((df["timestamp"].max() - df["timestamp"].min()).days, 1)
    per_category = {}
    for cat, total in cat_totals.items():
        monthly_avg = float(total) / max(cat_days / 30, 1)
        per_category[cat] = round(monthly_avg * buffer_mult, 0)

    # ── Breach days (days where daily threshold was exceeded) ──
    breach_days = []
    if daily_threshold > 0:
        breaches = daily_totals[daily_totals > daily_threshold]
        breach_days = [str(d) for d in breaches.index]

    return {
        "daily": max(daily_threshold, 100),   # Minimum INR 100 floor
        "weekly": max(weekly_threshold, 500),
        "monthly": max(monthly_threshold, 2000),
        "per_category": per_category,
        "breach_days": breach_days[-10:],  # Last 10 breach days
        "buffer_multiplier": round(buffer_mult, 2),
        "risk_adjustment": risk_score,
    }


def _default_thresholds():
    return {
        "daily": 2000.0,
        "weekly": 10000.0,
        "monthly": 35000.0,
        "per_category": {},
        "breach_days": [],
        "buffer_multiplier": 1.5,
        "risk_adjustment": 0,
    }
