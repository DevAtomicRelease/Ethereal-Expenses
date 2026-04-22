"""
Momentum Engine
================
7-day velocity + 30-day baseline. Computes velocity, acceleration,
direction, category drift, reversal signal, 30-day projection.
Architecture v2.0 Section 5.2 Step 8.
"""

import pandas as pd
import numpy as np
from datetime import timedelta
from typing import Any, Dict


def run(df: pd.DataFrame, brain: Dict[str, Any]) -> Dict[str, Any]:
    """Compute spending momentum signals."""
    if len(df) < 7:
        return _flat_result(brain)

    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    now = pd.Timestamp.now("UTC")

    last_7d = df[df["timestamp"] >= now - timedelta(days=7)]
    last_30d = df[df["timestamp"] >= now - timedelta(days=30)]

    # ── Velocity (INR/day) ──
    velocity_7d = float(last_7d["amount"].astype(float).sum()) / 7 if not last_7d.empty else 0
    velocity_30d = float(last_30d["amount"].astype(float).sum()) / 30 if not last_30d.empty else 0

    # ── Acceleration (7d vs 30d velocity delta) ──
    if velocity_30d > 0:
        acceleration = round((velocity_7d - velocity_30d) / velocity_30d, 3)
    else:
        acceleration = 0.0
    acceleration = max(-0.5, min(0.5, acceleration))

    # ── Direction classification ──
    if acceleration > 0.15:
        direction = "accelerating_fast"
    elif acceleration > 0.05:
        direction = "accelerating"
    elif acceleration < -0.15:
        direction = "decelerating_fast"
    elif acceleration < -0.05:
        direction = "decelerating"
    else:
        direction = "stable"

    # ── Spending velocity label ──
    if velocity_7d < 300:
        velocity_label = "very_low"
    elif velocity_7d < 800:
        velocity_label = "low"
    elif velocity_7d < 2000:
        velocity_label = "moderate"
    elif velocity_7d < 4000:
        velocity_label = "high"
    else:
        velocity_label = "very_high"

    # ── Category drift ──
    first_half = df[df["timestamp"] < now - timedelta(days=45)]
    second_half = df[df["timestamp"] >= now - timedelta(days=45)]

    drift = "stable"
    if not first_half.empty and not second_half.empty:
        cats_first = set(first_half["category"].value_counts().head(3).index)
        cats_second = set(second_half["category"].value_counts().head(3).index)
        overlap = len(cats_first & cats_second)
        total = max(len(cats_first | cats_second), 1)
        similarity = overlap / total

        if similarity >= 0.8:
            drift = "stable"
        elif similarity >= 0.5:
            drift = "slow_drift"
        elif similarity >= 0.3:
            drift = "moderate_drift"
        else:
            drift = "rapid_drift"

    # ── Reversal signal ──
    # Check if last 7 days reverses the 30-day trend
    reversal = False
    if len(last_30d) >= 14:
        mid_30 = now - timedelta(days=15)
        first_15d = last_30d[last_30d["timestamp"] < mid_30]
        last_15d = last_30d[last_30d["timestamp"] >= mid_30]

        if not first_15d.empty and not last_15d.empty:
            first_vel = float(first_15d["amount"].astype(float).sum()) / 15
            last_vel = float(last_15d["amount"].astype(float).sum()) / 15

            if first_vel > 0:
                trend_15d = (last_vel - first_vel) / first_vel
                # Reversal = 7d direction opposite to 15d trend
                if (trend_15d > 0.1 and acceleration < -0.05) or \
                   (trend_15d < -0.1 and acceleration > 0.05):
                    reversal = True

    # ── 30-day projection ──
    projection_30d = round(velocity_7d * 30, 2)

    return {
        "velocity": round(velocity_7d, 2),
        "velocity_30d": round(velocity_30d, 2),
        "acceleration": acceleration,
        "direction": direction,
        "spending_velocity": velocity_label,
        "spend_velocity_daily": round(velocity_7d, 2),
        "category_drift": drift,
        "reversal_signal": reversal,
        "projection_30d": projection_30d,
    }


def _flat_result(brain):
    vel = brain.get("spend_velocity_daily", 0)
    return {
        "velocity": vel,
        "velocity_30d": vel,
        "acceleration": 0.0,
        "direction": "stable",
        "spending_velocity": "low",
        "spend_velocity_daily": vel,
        "category_drift": "stable",
        "reversal_signal": False,
        "projection_30d": round(vel * 30, 2),
    }
