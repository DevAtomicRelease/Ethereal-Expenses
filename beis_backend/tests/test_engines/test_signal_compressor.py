"""Tests for behavioral_signal_compressor — conflicts, focus hints, payload."""

import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta

from app.engines import (
    behavioral_brain, identity_engine, anomaly_engine,
    behavior_shift_engine, momentum_engine, lifestyle_engine,
    risk_engine, adaptive_threshold_engine, behavioral_signal_compressor,
)


def _full_compress(n=80):
    now = datetime.now(timezone.utc)
    cats = ["food","transport","groceries","shopping","dining_out","coffee","entertainment","utilities"]
    df = pd.DataFrame([{
        "id": f"t{i}","timestamp": now - timedelta(days=i),
        "amount": max(50, round(np.random.normal(600, 250), 2)),
        "category": cats[i % len(cats)], "description": "",
    } for i in range(n)])
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

    brain = behavioral_brain.run(df)
    identity = identity_engine.run(brain)
    anomaly = anomaly_engine.run(df, brain)
    shift = behavior_shift_engine.run(df)
    momentum = momentum_engine.run(df, brain)
    lifestyle = lifestyle_engine.run(df, brain)
    risk = risk_engine.run(brain, identity, anomaly, momentum, lifestyle)
    threshold = adaptive_threshold_engine.run(df, brain, risk)

    return behavioral_signal_compressor.run(
        brain=brain, identity=identity, anomaly=anomaly,
        shift=shift, momentum=momentum, lifestyle=lifestyle,
        risk=risk, threshold=threshold,
    )


def test_required_keys():
    result = _full_compress()
    required = [
        "txn_count","median_txn","mean_txn","cv_ratio",
        "primary_identity","anomalies_detected","momentum_direction",
        "risk_score","risk_level",
        "conflict_flags","narrative_focus_hints",
        "data_maturity","signal_confidence",
    ]
    for k in required:
        assert k in result, f"Missing: {k}"


def test_conflict_flags_is_list():
    result = _full_compress()
    assert isinstance(result["conflict_flags"], list)
    assert isinstance(result["conflict_details"], list)


def test_focus_hints_is_list():
    result = _full_compress()
    assert isinstance(result["narrative_focus_hints"], list)


def test_maturity_valid():
    result = _full_compress()
    assert result["data_maturity"] in ["insufficient","early","developing","mature"]


def test_confidence_bounded():
    result = _full_compress()
    assert 0 < result["signal_confidence"] <= 1.0


def test_payload_has_50_plus_keys():
    result = _full_compress()
    assert len(result) >= 50, f"Expected 50+ keys, got {len(result)}"


def test_conflict_detection_frugal_anomaly():
    """Force a frugal identity + anomalies to trigger frugal_but_anomaly conflict."""
    # Build signals where identity is frugal but anomalies exist
    brain = {"txn_count": 80, "median_txn": 400, "mean_txn": 450, "spend_std": 100,
             "cv_ratio": 0.22, "rolling_7d_avg": 2000, "rolling_30d_avg": 9000,
             "txn_frequency_weekly": 8, "acceleration": -0.02,
             "top_categories": ["groceries","utilities","transport"],
             "dominant_categories": ["groceries","utilities"],
             "category_distribution": {"groceries": 0.5, "utilities": 0.3, "transport": 0.2},
             "time_pattern": {"morning": 0.5, "afternoon": 0.3, "evening": 0.15, "night": 0.04, "late_night": 0.01},
             "time_pattern_label": "morning_dominant",
             "social_ratio": 0.05, "discretionary_ratio": 0.0,
             "spend_velocity_daily": 300, "total_spend": 27000}
    identity = {"primary_identity": "frugal_disciplined", "secondary_identities": [],
                "identity_traits": ["frugal_disciplined"], "identity_confidence": 0.9,
                "identity_scores": {}, "impulsivity_index": 0.1, "self_control_score": 0.9,
                "identity_stability": "stable"}
    anomaly = {"anomalies_detected": True, "anomaly_count": 2,
               "anomaly_types": ["iqr_outlier","threshold_breach"],
               "anomaly_severity": "moderate", "recurrence_flag": False, "anomalies": []}
    shift = {"shift_detected": False, "shift_type": "no_shift", "shift_magnitude_pct": 0,
             "category_rotation": False, "new_categories": [], "dropped_categories": [],
             "time_pattern_shift": False}
    momentum = {"velocity": 300, "velocity_30d": 310, "acceleration": -0.02,
                "direction": "stable", "spending_velocity": "low",
                "spend_velocity_daily": 300, "category_drift": "stable",
                "reversal_signal": False, "projection_30d": 9000}
    lifestyle = {"lifestyle_signals": ["commute_regular"], "primary_lifestyle": "commute_regular",
                 "food_personality": "home_cook", "social_pattern": "loner"}
    risk = {"risk_score": 18, "risk_level": "safe",
            "risk_flags": {"high_volatility": False, "rapid_acceleration": False,
                           "anomaly_cluster": True, "lifestyle_inflation": False,
                           "budget_breach": True, "recurring_anomaly": False, "identity_unstable": False},
            "risk_drivers": ["anomaly_cluster","budget_breach"], "risk_trend": None}
    threshold = {"daily": 800, "weekly": 5000, "monthly": 18000, "per_category": {}, "breach_days": []}

    result = behavioral_signal_compressor.run(
        brain=brain, identity=identity, anomaly=anomaly, shift=shift,
        momentum=momentum, lifestyle=lifestyle, risk=risk, threshold=threshold)

    assert "frugal_but_anomaly" in result["conflict_flags"]
