"""Tests for momentum_engine — velocity, acceleration, reversal, projection."""

import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta

from app.engines import behavioral_brain, momentum_engine

def _run(n=60, base=500, std=200):
    now = datetime.now(timezone.utc)
    cats = ["food","transport","groceries","shopping"]
    df = pd.DataFrame([{
        "id": f"t{i}","timestamp": now - timedelta(days=i),
        "amount": max(50, round(np.random.normal(base, std), 2)),
        "category": cats[i % len(cats)], "description": "",
    } for i in range(n)])
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    brain = behavioral_brain.run(df)
    return momentum_engine.run(df, brain)


def test_direction_valid():
    assert _run()["direction"] in [
        "accelerating_fast","accelerating","stable","decelerating","decelerating_fast"]


def test_velocity_label():
    assert _run()["spending_velocity"] in ["very_low","low","moderate","high","very_high"]


def test_reversal_is_bool():
    assert isinstance(_run()["reversal_signal"], bool)


def test_projection_non_negative():
    assert _run()["projection_30d"] >= 0


def test_category_drift():
    assert _run()["category_drift"] in ["stable","slow_drift","moderate_drift","rapid_drift"]


def test_acceleration_bounded():
    result = _run()
    assert -0.5 <= result["acceleration"] <= 0.5
