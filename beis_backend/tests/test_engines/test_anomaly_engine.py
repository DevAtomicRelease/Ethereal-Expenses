"""Tests for anomaly_engine — IQR, spikes, surges, 30-txn guard."""

import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta

from app.engines import behavioral_brain, anomaly_engine


def _make_df(n=50, base=500, std=100):
    now = datetime.now(timezone.utc)
    cats = ["food","transport","groceries","shopping"]
    df = pd.DataFrame([{
        "id": f"t{i}","timestamp": now - timedelta(days=i*1.5, hours=i%24),
        "amount": max(50, round(np.random.normal(base, std), 2)),
        "category": cats[i % len(cats)], "description": "",
    } for i in range(n)])
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    return df


def test_disabled_below_30():
    df = _make_df(20)
    brain = {"txn_count": 20, "median_txn": 500}
    result = anomaly_engine.run(df, brain)
    assert result["anomalies_detected"] is False
    assert "disabled_reason" in result


def test_returns_list():
    df = _make_df(50)
    brain = behavioral_brain.run(df)
    result = anomaly_engine.run(df, brain)
    assert isinstance(result["anomalies"], list)
    assert isinstance(result["anomaly_count"], int)


def test_detects_outlier():
    df = _make_df(50, base=500, std=100)
    df.loc[0, "amount"] = 50000.0
    brain = behavioral_brain.run(df)
    result = anomaly_engine.run(df, brain)
    assert result["anomaly_count"] >= 1
    types = [a["anomaly_type"] for a in result["anomalies"]]
    assert "iqr_outlier" in types or "extreme_transaction_ratio" in types


def test_severity_values():
    df = _make_df(50, base=500, std=100)
    df.loc[0, "amount"] = 50000.0
    brain = behavioral_brain.run(df)
    result = anomaly_engine.run(df, brain)
    for a in result["anomalies"]:
        assert a["severity"] in ["mild","moderate","severe"]


def test_recurrence_flag():
    df = _make_df(60)
    brain = behavioral_brain.run(df)
    result = anomaly_engine.run(df, brain)
    assert isinstance(result["recurrence_flag"], bool)
