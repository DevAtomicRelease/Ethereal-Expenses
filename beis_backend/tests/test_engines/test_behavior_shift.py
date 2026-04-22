"""Tests for behavior_shift_engine — 30d vs 60d comparison."""

import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta

from app.engines import behavior_shift_engine

VALID_TYPES = ["spending_increase","spending_decrease","category_migration",
               "time_pattern_shift","sudden_spike","gradual_escalation","no_shift"]

def _make_df(n=60, base=500, std=100):
    now = datetime.now(timezone.utc)
    cats = ["food","transport","groceries","shopping","dining_out","coffee","entertainment","utilities"]
    df = pd.DataFrame([{
        "id": f"t{i}","timestamp": now - timedelta(days=i*1.3),
        "amount": max(50, round(np.random.normal(base, std), 2)),
        "category": cats[i % len(cats)], "description": "",
    } for i in range(n)])
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    return df


def test_output_keys():
    result = behavior_shift_engine.run(_make_df())
    for key in ["shift_detected","shift_type","shift_magnitude_pct","category_rotation",
                "new_categories","dropped_categories","time_pattern_shift"]:
        assert key in result


def test_shift_type_valid():
    result = behavior_shift_engine.run(_make_df())
    assert result["shift_type"] in VALID_TYPES


def test_insufficient_data():
    df = _make_df(5)
    result = behavior_shift_engine.run(df)
    assert result["shift_detected"] is False
    assert result["shift_type"] == "no_shift"


def test_magnitude_non_negative():
    result = behavior_shift_engine.run(_make_df())
    assert result["shift_magnitude_pct"] >= 0
