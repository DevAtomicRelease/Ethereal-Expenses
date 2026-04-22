"""Tests for risk_engine — 0-100 score, 7 boolean flags, weighted formula."""

import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta

from app.engines import (
    behavioral_brain, identity_engine, anomaly_engine,
    momentum_engine, lifestyle_engine, risk_engine,
)

def _full_risk(n=80, base=500, std=200):
    now = datetime.now(timezone.utc)
    cats = ["food","transport","groceries","shopping","dining_out","coffee","entertainment","utilities"]
    df = pd.DataFrame([{
        "id": f"t{i}","timestamp": now - timedelta(days=i),
        "amount": max(50, round(np.random.normal(base, std), 2)),
        "category": cats[i % len(cats)], "description": "",
    } for i in range(n)])
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    brain = behavioral_brain.run(df)
    identity = identity_engine.run(brain)
    anomaly = anomaly_engine.run(df, brain)
    momentum = momentum_engine.run(df, brain)
    lifestyle = lifestyle_engine.run(df, brain)
    return risk_engine.run(brain, identity, anomaly, momentum, lifestyle)


def test_score_range():
    result = _full_risk()
    assert 0 <= result["risk_score"] <= 100


def test_level_valid():
    result = _full_risk()
    assert result["risk_level"] in ["safe","watch","concern","danger"]


def test_seven_flags():
    flags = _full_risk()["risk_flags"]
    assert len(flags) == 7
    expected = ["high_volatility","rapid_acceleration","anomaly_cluster",
                "lifestyle_inflation","budget_breach","recurring_anomaly","identity_unstable"]
    for f in expected:
        assert f in flags, f"Missing flag: {f}"
        assert isinstance(flags[f], bool)


def test_drivers_list():
    result = _full_risk()
    assert isinstance(result["risk_drivers"], list)


def test_level_matches_score():
    result = _full_risk()
    s = result["risk_score"]
    l = result["risk_level"]
    if s < 25: assert l == "safe"
    elif s < 50: assert l == "watch"
    elif s < 75: assert l == "concern"
    else: assert l == "danger"


def test_trend_with_memory():
    brain_data = behavioral_brain.run(
        pd.DataFrame([{
            "id": f"t{i}","timestamp": datetime.now(timezone.utc) - timedelta(days=i),
            "amount": 500, "category": "food", "description": "",
        } for i in range(80)])
    )
    brain_data["timestamp"] = None  # won't be used
    identity = identity_engine.run(brain_data)
    anomaly = {"anomalies_detected": False, "anomaly_count": 0, "anomaly_types": [], "recurrence_flag": False}
    momentum = {"acceleration": 0, "direction": "stable"}
    lifestyle = {"lifestyle_signals": []}
    mem = {"risk_score": 20}
    result = risk_engine.run(brain_data, identity, anomaly, momentum, lifestyle, memory=mem)
    assert result["risk_trend"] in ["improving","worsening","stable", None]
