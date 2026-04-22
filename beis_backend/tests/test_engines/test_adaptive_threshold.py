"""Tests for adaptive_threshold_engine — risk-adjusted INR limits."""

import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta

from app.engines import behavioral_brain, adaptive_threshold_engine


def _make_df(n=80, base=800):
    now = datetime.now(timezone.utc)
    cats = ["food","transport","groceries","shopping"]
    df = pd.DataFrame([{
        "id": f"t{i}","timestamp": now - timedelta(days=i),
        "amount": max(50, round(np.random.normal(base, 200), 2)),
        "category": cats[i % len(cats)], "description": "",
    } for i in range(n)])
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    return df


def test_basic_thresholds():
    df = _make_df()
    brain = behavioral_brain.run(df)
    result = adaptive_threshold_engine.run(df, brain, {"risk_score": 40})
    assert result["daily"] >= 100
    assert result["weekly"] >= 500
    assert result["monthly"] >= 2000


def test_per_category_dict():
    df = _make_df()
    brain = behavioral_brain.run(df)
    result = adaptive_threshold_engine.run(df, brain, {"risk_score": 30})
    assert isinstance(result["per_category"], dict)


def test_risk_tightens_thresholds():
    df = _make_df()
    brain = behavioral_brain.run(df)
    low = adaptive_threshold_engine.run(df, brain, {"risk_score": 10})
    high = adaptive_threshold_engine.run(df, brain, {"risk_score": 90})
    assert high["daily"] <= low["daily"]


def test_breach_days_list():
    df = _make_df()
    brain = behavioral_brain.run(df)
    result = adaptive_threshold_engine.run(df, brain, {"risk_score": 50})
    assert isinstance(result["breach_days"], list)


def test_insufficient_data():
    df = _make_df(5)
    brain = behavioral_brain.run(df)
    result = adaptive_threshold_engine.run(df, brain, {"risk_score": 0})
    assert result["daily"] == 2000.0  # Default
