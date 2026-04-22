"""Tests for lifestyle_engine — signals, food personality, social pattern."""

import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta

from app.engines import behavioral_brain, lifestyle_engine

def _run(n=60):
    now = datetime.now(timezone.utc)
    cats = ["food","dining_out","groceries","coffee","entertainment","health","transport","subscriptions"]
    df = pd.DataFrame([{
        "id": f"t{i}","timestamp": now - timedelta(days=i, hours=np.random.randint(0,24)),
        "amount": max(50, round(np.random.normal(600, 200), 2)),
        "category": cats[i % len(cats)], "description": "",
    } for i in range(n)])
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    brain = behavioral_brain.run(df)
    return lifestyle_engine.run(df, brain)


def test_signals_non_empty():
    result = _run()
    assert len(result["lifestyle_signals"]) >= 1


def test_primary_lifestyle():
    result = _run()
    assert result["primary_lifestyle"] in result["lifestyle_signals"]


def test_food_personality_valid():
    assert _run()["food_personality"] in ["gourmet","convenience","home_cook","balanced","none"]


def test_social_pattern_valid():
    assert _run()["social_pattern"] in ["loner","occasional_social","regular_social","hyper_social","none"]


def test_insufficient_data():
    now = datetime.now(timezone.utc)
    df = pd.DataFrame([{
        "id": "t0","timestamp": now, "amount": 100, "category": "food", "description": "",
    }])
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    brain = behavioral_brain.run(df)
    result = lifestyle_engine.run(df, brain)
    assert result["primary_lifestyle"] == "no_distinct_lifestyle"
