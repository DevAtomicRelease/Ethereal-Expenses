"""
Behavioral Brain Engine
========================
Computes 18 statistical features from the 90-day transaction window.
Architecture v2.0 Section 5.2 Step 4, Engine Reference Matrix.

Outputs: median, mean, std, CV ratio, rolling 7d/30d averages,
transaction frequency, spend acceleration, category distribution,
time-of-day pattern, social spend ratio, discretionary ratio.
"""

import pandas as pd
import numpy as np
from datetime import timedelta
from typing import Dict, Any

from app.data.models import VALID_CATEGORIES

SOCIAL_CATEGORIES = {"dining_out", "alcohol", "entertainment", "gifts", "coffee"}
DISCRETIONARY_CATEGORIES = {
    "entertainment", "shopping", "dining_out", "alcohol", "clothing",
    "electronics", "travel", "gifts", "coffee", "personal_care",
}
TIME_SLOTS = ["morning", "afternoon", "evening", "night", "late_night"]


def _time_slot(hour: int) -> str:
    """Map hour (0-23) to time slot."""
    if 5 <= hour < 12:
        return "morning"
    elif 12 <= hour < 17:
        return "afternoon"
    elif 17 <= hour < 21:
        return "evening"
    elif 21 <= hour < 24:
        return "night"
    else:
        return "late_night"


def run(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute 18 behavioral statistics from transaction DataFrame.

    Args:
        df: DataFrame with columns [timestamp, amount, category, description].
            Already filtered to 90-day window by caller.

    Returns:
        Dict of 18 features matching the compressed signal schema.
    """
    if df.empty:
        return _empty_result()

    amounts = df["amount"].astype(float)
    n = len(df)

    # ── Core statistics ──
    median_txn = float(amounts.median())
    mean_txn = float(amounts.mean())
    spend_std = float(amounts.std()) if n > 1 else 0.0
    cv_ratio = round(spend_std / mean_txn, 3) if mean_txn > 0 else 0.0

    # ── Rolling averages ──
    df_sorted = df.sort_values("timestamp")
    now = pd.Timestamp.now("UTC")

    last_7d = df_sorted[df_sorted["timestamp"] >= now - timedelta(days=7)]
    last_30d = df_sorted[df_sorted["timestamp"] >= now - timedelta(days=30)]

    rolling_7d_avg = float(last_7d["amount"].astype(float).sum()) if not last_7d.empty else 0.0
    rolling_30d_avg = float(last_30d["amount"].astype(float).sum()) if not last_30d.empty else 0.0

    # ── Transaction frequency (per week) ──
    if n >= 2:
        date_range = (df_sorted["timestamp"].max() - df_sorted["timestamp"].min()).days
        weeks = max(date_range / 7, 1)
        txn_frequency_weekly = round(n / weeks, 1)
    else:
        txn_frequency_weekly = float(n)

    # ── Spend acceleration ──
    # Compare first-half vs second-half average daily spend
    if n >= 4:
        midpoint = len(df_sorted) // 2
        first_half = df_sorted.iloc[:midpoint]["amount"].astype(float)
        second_half = df_sorted.iloc[midpoint:]["amount"].astype(float)

        first_avg = first_half.mean() if len(first_half) > 0 else 0
        second_avg = second_half.mean() if len(second_half) > 0 else 0

        if first_avg > 0:
            acceleration = round((second_avg - first_avg) / first_avg, 3)
        else:
            acceleration = 0.0
        acceleration = max(-0.45, min(0.45, acceleration))
    else:
        acceleration = 0.0

    # ── Category distribution ──
    cat_counts = df["category"].value_counts()
    total_by_cat = df.groupby("category")["amount"].sum().astype(float)
    total_spend = amounts.sum()

    category_distribution = {}
    if total_spend > 0:
        for cat in total_by_cat.index:
            category_distribution[cat] = round(float(total_by_cat[cat]) / total_spend, 3)

    top_categories = list(cat_counts.head(5).index)
    dominant_categories = list(cat_counts.head(3).index)

    # ── Time-of-day pattern ──
    time_pattern = {slot: 0.0 for slot in TIME_SLOTS}
    if "timestamp" in df.columns:
        hours = pd.to_datetime(df["timestamp"]).dt.hour
        slot_series = hours.apply(_time_slot)
        slot_counts = slot_series.value_counts()
        total_slots = slot_counts.sum()
        if total_slots > 0:
            for slot, count in slot_counts.items():
                time_pattern[slot] = round(count / total_slots, 2)

    time_pattern_label = max(time_pattern, key=time_pattern.get) + "_dominant"

    # ── Social and discretionary ratios ──
    social_amount = df[df["category"].isin(SOCIAL_CATEGORIES)]["amount"].astype(float).sum()
    social_ratio = round(social_amount / total_spend, 2) if total_spend > 0 else 0.0

    disc_cats_in_top = set(top_categories) & DISCRETIONARY_CATEGORIES
    discretionary_ratio = round(len(disc_cats_in_top) / max(len(top_categories), 1), 2)

    # ── Spend velocity (INR/day) ──
    if n >= 2:
        date_range = max((df_sorted["timestamp"].max() - df_sorted["timestamp"].min()).days, 1)
        spend_velocity_daily = round(total_spend / date_range, 2)
    else:
        spend_velocity_daily = float(total_spend)

    return {
        "txn_count": n,
        "median_txn": round(median_txn, 2),
        "mean_txn": round(mean_txn, 2),
        "spend_std": round(spend_std, 2),
        "cv_ratio": cv_ratio,
        "rolling_7d_avg": round(rolling_7d_avg, 2),
        "rolling_30d_avg": round(rolling_30d_avg, 2),
        "txn_frequency_weekly": txn_frequency_weekly,
        "acceleration": acceleration,
        "top_categories": top_categories,
        "dominant_categories": dominant_categories,
        "category_distribution": category_distribution,
        "time_pattern": time_pattern,
        "time_pattern_label": time_pattern_label,
        "social_ratio": social_ratio,
        "discretionary_ratio": discretionary_ratio,
        "spend_velocity_daily": spend_velocity_daily,
        "total_spend": round(float(total_spend), 2),
    }


def _empty_result() -> Dict[str, Any]:
    return {
        "txn_count": 0,
        "median_txn": 0.0,
        "mean_txn": 0.0,
        "spend_std": 0.0,
        "cv_ratio": 0.0,
        "rolling_7d_avg": 0.0,
        "rolling_30d_avg": 0.0,
        "txn_frequency_weekly": 0.0,
        "acceleration": 0.0,
        "top_categories": [],
        "dominant_categories": [],
        "category_distribution": {},
        "time_pattern": {s: 0.0 for s in TIME_SLOTS},
        "time_pattern_label": "morning_dominant",
        "social_ratio": 0.0,
        "discretionary_ratio": 0.0,
        "spend_velocity_daily": 0.0,
        "total_spend": 0.0,
    }
