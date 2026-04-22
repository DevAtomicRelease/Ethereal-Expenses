"""
Lifestyle Engine
=================
Identifies lifestyle archetypes from 90-day timing and category patterns.
Detects recurring routines (min 3 occurrences), food personality, social pattern.
Architecture v2.0 Section 5.2 Step 9.
"""

import pandas as pd
from typing import Any, Dict, List
from datetime import timedelta


def run(df: pd.DataFrame, brain: Dict[str, Any]) -> Dict[str, Any]:
    """Infer lifestyle signals from spending patterns."""
    if len(df) < 10:
        return _default_result()

    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    cats = set(brain.get("top_categories", []))
    time_pattern = brain.get("time_pattern", {})
    social_ratio = brain.get("social_ratio", 0)
    night_ratio = time_pattern.get("night", 0) + time_pattern.get("late_night", 0)

    signals: List[str] = []

    # ── Nightlife ──
    nightlife_cats = {"alcohol", "dining_out", "entertainment"}
    if cats & nightlife_cats and night_ratio > 0.3:
        signals.append("nightlife_heavy")
    elif cats & nightlife_cats and night_ratio > 0.15:
        signals.append("nightlife_regular")
    elif cats & nightlife_cats:
        signals.append("nightlife_occasional")

    # ── Weekend bias ──
    df["weekday"] = df["timestamp"].dt.weekday
    weekend = df[df["weekday"] >= 5]
    weekday = df[df["weekday"] < 5]
    if not weekday.empty and not weekend.empty:
        weekend_avg = float(weekend["amount"].astype(float).mean())
        weekday_avg = float(weekday["amount"].astype(float).mean())
        if weekday_avg > 0:
            ratio = weekend_avg / weekday_avg
            if ratio > 2.0:
                signals.append("weekend_bias_strong")
            elif ratio > 1.4:
                signals.append("weekend_bias_moderate")
            elif ratio > 1.1:
                signals.append("weekend_bias_slight")

    # ── Social events ──
    if social_ratio > 0.5:
        signals.append("social_events_very_frequent")
    elif social_ratio > 0.3:
        signals.append("social_events_frequent")
    elif social_ratio > 0.15:
        signals.append("social_events_occasional")

    # ── Health consciousness ──
    health_cats = {"health", "fitness"}
    health_txns = df[df["category"].isin(health_cats)]
    if len(health_txns) >= 8:
        signals.append("health_dedicated")
    elif len(health_txns) >= 3:
        signals.append("health_regular")
    elif len(health_txns) >= 1:
        signals.append("health_occasional")

    # ── Subscription dependency ──
    sub_txns = df[df["category"] == "subscriptions"]
    if len(sub_txns) >= 6:
        signals.append("subscriptions_heavy")
    elif len(sub_txns) >= 3:
        signals.append("subscriptions_moderate")
    elif len(sub_txns) >= 1:
        signals.append("subscriptions_light")

    # ── Commute pattern ──
    commute_cats = {"transport", "fuel"}
    commute_txns = df[df["category"].isin(commute_cats)]
    if len(commute_txns) >= 15:
        signals.append("commute_heavy")
    elif len(commute_txns) >= 5:
        signals.append("commute_regular")
    elif len(commute_txns) >= 2:
        signals.append("commute_light")

    if not signals:
        signals.append("no_distinct_lifestyle")

    # ── Food personality ──
    food_txns = df[df["category"].isin({"food", "dining_out", "groceries", "coffee"})]
    food_personality = "none"
    if len(food_txns) >= 3:
        dining_pct = len(food_txns[food_txns["category"] == "dining_out"]) / len(food_txns)
        grocery_pct = len(food_txns[food_txns["category"] == "groceries"]) / len(food_txns)
        coffee_pct = len(food_txns[food_txns["category"] == "coffee"]) / len(food_txns)

        if dining_pct > 0.5:
            food_personality = "gourmet"
        elif grocery_pct > 0.5:
            food_personality = "home_cook"
        elif coffee_pct > 0.3:
            food_personality = "convenience"
        else:
            food_personality = "balanced"

    # ── Social pattern ──
    if social_ratio > 0.5:
        social_pattern = "hyper_social"
    elif social_ratio > 0.3:
        social_pattern = "regular_social"
    elif social_ratio > 0.1:
        social_pattern = "occasional_social"
    else:
        social_pattern = "loner"

    return {
        "lifestyle_signals": signals[:5],
        "primary_lifestyle": signals[0],
        "food_personality": food_personality,
        "social_pattern": social_pattern,
    }


def _default_result():
    return {
        "lifestyle_signals": ["no_distinct_lifestyle"],
        "primary_lifestyle": "no_distinct_lifestyle",
        "food_personality": "none",
        "social_pattern": "none",
    }
