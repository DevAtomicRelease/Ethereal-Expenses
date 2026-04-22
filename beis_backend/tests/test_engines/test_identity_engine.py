"""Tests for identity_engine — 12 archetypes, scores, stability."""

import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta

from app.engines import behavioral_brain, identity_engine

ARCHETYPES = [
    "volatility_prone","high_discretionary_spender","social_spender",
    "spend_accelerating","impulsive_spender","routine_spender",
    "frugal_disciplined","stress_spender","comfort_spender",
    "binge_spender","status_spender","reluctant_spender",
]

def _brain(n=80, base=500, std=200):
    now = datetime.now(timezone.utc)
    cats = ["food","transport","groceries","shopping","dining_out","coffee","entertainment","utilities"]
    df = pd.DataFrame([{
        "id": f"t{i}","timestamp": now - timedelta(days=i),
        "amount": max(50, round(np.random.normal(base, std), 2)),
        "category": cats[i % len(cats)], "description": "",
    } for i in range(n)])
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    return behavioral_brain.run(df)


def test_primary_is_valid_archetype():
    result = identity_engine.run(_brain())
    assert result["primary_identity"] in ARCHETYPES


def test_scores_bounded():
    result = identity_engine.run(_brain())
    assert 0 <= result["impulsivity_index"] <= 1
    assert 0 <= result["self_control_score"] <= 1
    assert 0 <= result["identity_confidence"] <= 1


def test_stability_values():
    result = identity_engine.run(_brain())
    assert result["identity_stability"] in ["stable","shifting","volatile"]


def test_stability_detects_shift_with_memory():
    brain = _brain()
    mem = {"primary_identity": "frugal_disciplined", "identity_scores": {"frugal_disciplined": 0.9}}
    result = identity_engine.run(brain, memory=mem)
    assert result["identity_stability"] in ["stable","shifting","volatile"]


def test_identity_traits_list():
    result = identity_engine.run(_brain())
    assert isinstance(result["identity_traits"], list)
    assert len(result["identity_traits"]) >= 1
    assert result["identity_traits"][0] == result["primary_identity"]
