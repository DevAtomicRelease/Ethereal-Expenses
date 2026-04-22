"""Tests for behavioral_brain engine — 18 statistical features."""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta

from app.engines import behavioral_brain


def _make_df(n=100, base=500, std=200, days=80):
    now = datetime.now(timezone.utc)
    cats = ["food","transport","groceries","shopping","dining_out",
            "coffee","entertainment","utilities"]
    records = [{
        "id": f"txn_{i}",
        "timestamp": now - timedelta(days=i * days / n, hours=i % 24),
        "amount": max(50, round(np.random.normal(base, std), 2)),
        "category": cats[i % len(cats)],
        "description": f"Txn {i}",
    } for i in range(n)]
    df = pd.DataFrame(records)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    return df


def test_basic_stats():
    result = behavioral_brain.run(_make_df(50, base=1000, std=300))
    assert result["txn_count"] == 50
    assert result["median_txn"] > 0
    assert result["mean_txn"] > 0
    assert result["spend_std"] >= 0
    assert result["cv_ratio"] >= 0


def test_18_features_present():
    result = behavioral_brain.run(_make_df(100))
    required = [
        "txn_count","median_txn","mean_txn","spend_std","cv_ratio",
        "rolling_7d_avg","rolling_30d_avg","txn_frequency_weekly",
        "acceleration","top_categories","dominant_categories",
        "category_distribution","time_pattern","time_pattern_label",
        "social_ratio","discretionary_ratio","spend_velocity_daily","total_spend",
    ]
    for key in required:
        assert key in result, f"Missing: {key}"


def test_empty_df():
    df = pd.DataFrame(columns=["id","timestamp","amount","category","description"])
    result = behavioral_brain.run(df)
    assert result["txn_count"] == 0


def test_category_distribution_sums_near_one():
    dist = behavioral_brain.run(_make_df(80))["category_distribution"]
    if dist:
        assert abs(sum(dist.values()) - 1.0) < 0.05


def test_time_pattern_sums_near_one():
    tp = behavioral_brain.run(_make_df(80))["time_pattern"]
    assert abs(sum(tp.values()) - 1.0) < 0.05


def test_acceleration_bounded():
    result = behavioral_brain.run(_make_df(100))
    assert -0.45 <= result["acceleration"] <= 0.45
