"""
Behavior Shift Engine
======================
Compares current 30-day window against prior 60-day window (within 90d).
Detects category rotation, magnitude shifts, structural changes.
Architecture v2.0 Section 5.2 Step 7.
"""

import pandas as pd
import numpy as np
from datetime import timedelta
from typing import Any, Dict


def run(df: pd.DataFrame) -> Dict[str, Any]:
    """Detect behavioral shifts: 30d current vs 60d prior."""
    if len(df) < 10:
        return _no_shift()

    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    now = pd.Timestamp.now("UTC")

    current = df[df["timestamp"] >= now - timedelta(days=30)]
    prior = df[(df["timestamp"] < now - timedelta(days=30)) &
               (df["timestamp"] >= now - timedelta(days=90))]

    if current.empty or prior.empty or len(current) < 5 or len(prior) < 5:
        return _no_shift()

    current_amounts = current["amount"].astype(float)
    prior_amounts = prior["amount"].astype(float)

    # ── Spending magnitude shift ──
    current_avg = current_amounts.mean()
    prior_avg = prior_amounts.mean()

    if prior_avg > 0:
        change_pct = round(((current_avg - prior_avg) / prior_avg) * 100, 1)
    else:
        change_pct = 0.0

    if abs(change_pct) < 5:
        shift_type = "no_shift"
    elif change_pct > 0:
        shift_type = "spending_increase"
    else:
        shift_type = "spending_decrease"

    # ── Category rotation ──
    current_cats = set(current["category"].value_counts().head(3).index)
    prior_cats = set(prior["category"].value_counts().head(3).index)

    new_cats = current_cats - prior_cats
    dropped_cats = prior_cats - current_cats
    category_rotation = len(new_cats) > 0 or len(dropped_cats) > 0

    if category_rotation and shift_type == "no_shift":
        shift_type = "category_migration"

    # ── Time pattern shift ──
    def _time_dist(subset):
        hours = pd.to_datetime(subset["timestamp"]).dt.hour
        slots = hours.apply(lambda h: "morning" if 5<=h<12 else "afternoon" if 12<=h<17
                            else "evening" if 17<=h<21 else "night" if 21<=h<24 else "late_night")
        return slots.value_counts(normalize=True).to_dict()

    current_time = _time_dist(current)
    prior_time = _time_dist(prior)
    time_shift = False
    all_slots = set(list(current_time.keys()) + list(prior_time.keys()))
    time_drift = sum(abs(current_time.get(s, 0) - prior_time.get(s, 0)) for s in all_slots)
    if time_drift > 0.4:
        time_shift = True
        if shift_type == "no_shift":
            shift_type = "time_pattern_shift"

    # ── Sudden spike detection ──
    daily_current = current.groupby(current["timestamp"].dt.date)["amount"].sum().astype(float)
    if len(daily_current) > 0:
        max_day = daily_current.max()
        avg_day = daily_current.mean()
        if avg_day > 0 and max_day > avg_day * 4:
            if shift_type == "no_shift":
                shift_type = "sudden_spike"

    shift_detected = shift_type != "no_shift"

    return {
        "shift_detected": shift_detected,
        "shift_type": shift_type,
        "shift_magnitude_pct": abs(change_pct) if shift_detected else 0,
        "category_rotation": category_rotation,
        "new_categories": list(new_cats),
        "dropped_categories": list(dropped_cats),
        "time_pattern_shift": time_shift,
        "current_30d_avg": round(current_avg, 2),
        "prior_60d_avg": round(prior_avg, 2),
    }


def _no_shift():
    return {
        "shift_detected": False,
        "shift_type": "no_shift",
        "shift_magnitude_pct": 0,
        "category_rotation": False,
        "new_categories": [],
        "dropped_categories": [],
        "time_pattern_shift": False,
        "current_30d_avg": 0.0,
        "prior_60d_avg": 0.0,
    }
