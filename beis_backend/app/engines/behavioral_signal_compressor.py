"""
Behavioral Signal Compressor
==============================
Distills all 9 engine outputs into compact semantic features.
Detects and flags signal conflicts. Populates narrative_focus_hints.
Architecture v2.0 Section 5.2 Step 12.
"""

from typing import Any, Dict, List


# ── Conflict detection rules (architecture Section 6.2) ──
CONFLICT_RULES = [
    {
        "name": "high_risk_decelerating",
        "check": lambda s: s["risk"]["risk_level"] in ("concern", "danger")
                           and "decelerating" in s["momentum"]["direction"],
        "hint": "Risk elevated from past behavior but trajectory improving.",
    },
    {
        "name": "frugal_but_anomaly",
        "check": lambda s: s["identity"]["primary_identity"] == "frugal_disciplined"
                           and s["anomaly"]["anomalies_detected"],
        "hint": "Normally disciplined spender has out-of-character anomalies.",
    },
    {
        "name": "stable_but_drifting",
        "check": lambda s: s["momentum"]["direction"] == "stable"
                           and s["momentum"]["category_drift"] in ("moderate_drift", "rapid_drift"),
        "hint": "Total amount stable but where money goes is changing fast.",
    },
    {
        "name": "accelerating_but_safe",
        "check": lambda s: "accelerating" in s["momentum"]["direction"]
                           and s["risk"]["risk_level"] == "safe",
        "hint": "Spending increasing but from a very low base.",
    },
    {
        "name": "volatile_but_routine",
        "check": lambda s: "volatility_prone" in s["identity"].get("identity_traits", [])
                           and "routine_spender" in s["identity"].get("identity_traits", []),
        "hint": "Amounts vary a lot but timing and categories are consistent.",
    },
    {
        "name": "anomaly_present_risk_minimal",
        "check": lambda s: s["anomaly"]["anomalies_detected"]
                           and s["risk"]["risk_level"] == "safe",
        "hint": "Unusual transaction but overall pattern is completely safe.",
    },
    {
        "name": "social_spender_increasing_solo",
        "check": lambda s: s["identity"]["primary_identity"] == "social_spender"
                           and s["lifestyle"].get("social_pattern") == "loner",
        "hint": "Historical social spender shifting to solo spending pattern.",
    },
    {
        "name": "stress_spender_improving",
        "check": lambda s: s["identity"]["primary_identity"] == "stress_spender"
                           and s["identity"].get("self_control_score", 0) > 0.6
                           and "decelerating" in s["momentum"]["direction"],
        "hint": "Stress-driven history but self-control rising and spend decelerating.",
    },
    {
        "name": "nightlife_and_health",
        "check": lambda s: any("nightlife_heavy" in sig for sig in s["lifestyle"].get("lifestyle_signals", []))
                           and any("health" in sig for sig in s["lifestyle"].get("lifestyle_signals", [])),
        "hint": "Heavy nightlife and dedicated health spending coexist.",
    },
    {
        "name": "high_disc_decelerating",
        "check": lambda s: s["identity"]["primary_identity"] == "high_discretionary_spender"
                           and "decelerating" in s["momentum"]["direction"],
        "hint": "Spends on wants not needs but rate is slowing down.",
    },
]


def run(
    brain: Dict[str, Any],
    identity: Dict[str, Any],
    anomaly: Dict[str, Any],
    shift: Dict[str, Any],
    momentum: Dict[str, Any],
    lifestyle: Dict[str, Any],
    risk: Dict[str, Any],
    threshold: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Compress all engine outputs into a compact signal payload for the LLM.

    Returns:
        Compressed signals dict with conflict_flags and narrative_focus_hints.
    """
    # ── Build signal bundle for conflict detection ──
    signal_bundle = {
        "brain": brain,
        "identity": identity,
        "anomaly": anomaly,
        "shift": shift,
        "momentum": momentum,
        "lifestyle": lifestyle,
        "risk": risk,
        "threshold": threshold,
    }

    # ── Detect conflicts ──
    conflict_flags: List[str] = []
    conflict_details: List[Dict] = []
    for rule in CONFLICT_RULES:
        try:
            if rule["check"](signal_bundle):
                conflict_flags.append(rule["name"])
                conflict_details.append({
                    "conflict": rule["name"],
                    "hint": rule["hint"],
                })
        except (KeyError, TypeError):
            continue

    # ── Generate narrative focus hints ──
    focus_hints: List[str] = []
    if risk["risk_score"] > 60:
        focus_hints.append("emphasize_risk")
    if anomaly.get("anomalies_detected"):
        focus_hints.append("explain_anomalies")
    if shift.get("shift_detected"):
        focus_hints.append("describe_shift")
    if identity.get("identity_stability") == "volatile":
        focus_hints.append("note_identity_instability")
    if momentum.get("reversal_signal"):
        focus_hints.append("highlight_reversal")
    if conflict_flags:
        focus_hints.append("resolve_contradictions")

    # ── Data maturity ──
    txn_count = brain.get("txn_count", 0)
    if txn_count < 15:
        data_maturity = "insufficient"
    elif txn_count < 50:
        data_maturity = "early"
    elif txn_count < 150:
        data_maturity = "developing"
    else:
        data_maturity = "mature"

    confidence_base = {
        "insufficient": 0.15, "early": 0.35,
        "developing": 0.60, "mature": 0.85,
    }
    signal_confidence = round(min(confidence_base[data_maturity], 0.98), 2)

    if data_maturity in ("early", "insufficient"):
        focus_hints.append("use_hedge_language")

    # ── Compressed output (sent to Mistral 7B) ──
    compressed = {
        # Brain summary
        "txn_count": brain.get("txn_count", 0),
        "median_txn": brain.get("median_txn", 0),
        "mean_txn": brain.get("mean_txn", 0),
        "spend_std": brain.get("spend_std", 0),
        "cv_ratio": brain.get("cv_ratio", 0),
        "rolling_7d_avg": brain.get("rolling_7d_avg", 0),
        "rolling_30d_avg": brain.get("rolling_30d_avg", 0),
        "txn_frequency_weekly": brain.get("txn_frequency_weekly", 0),
        "acceleration": brain.get("acceleration", 0),
        "top_categories": brain.get("top_categories", []),
        "category_distribution": brain.get("category_distribution", {}),
        "time_pattern": brain.get("time_pattern", {}),
        "time_pattern_label": brain.get("time_pattern_label", ""),
        "social_ratio": brain.get("social_ratio", 0),
        "discretionary_ratio": brain.get("discretionary_ratio", 0),

        # Identity
        "primary_identity": identity.get("primary_identity", ""),
        "secondary_identities": identity.get("secondary_identities", []),
        "identity_traits": identity.get("identity_traits", []),
        "identity_confidence": identity.get("identity_confidence", 0),
        "impulsivity_index": identity.get("impulsivity_index", 0),
        "self_control_score": identity.get("self_control_score", 0),
        "identity_stability": identity.get("identity_stability", "stable"),

        # Anomaly
        "anomalies_detected": anomaly.get("anomalies_detected", False),
        "anomaly_count": anomaly.get("anomaly_count", 0),
        "anomaly_types": anomaly.get("anomaly_types", []),
        "anomaly_severity": anomaly.get("anomaly_severity", "clean"),
        "anomaly_recurrence": anomaly.get("recurrence_flag", False),

        # Shift
        "shift_detected": shift.get("shift_detected", False),
        "shift_type": shift.get("shift_type", "no_shift"),
        "shift_magnitude_pct": shift.get("shift_magnitude_pct", 0),
        "category_rotation": shift.get("category_rotation", False),

        # Momentum
        "momentum_direction": momentum.get("direction", "stable"),
        "category_drift": momentum.get("category_drift", "stable"),
        "spending_velocity": momentum.get("spending_velocity", "low"),
        "spend_velocity_daily": momentum.get("spend_velocity_daily", 0),
        "reversal_signal": momentum.get("reversal_signal", False),
        "projection_30d": momentum.get("projection_30d", 0),

        # Lifestyle
        "lifestyle_signals": lifestyle.get("lifestyle_signals", []),
        "primary_lifestyle": lifestyle.get("primary_lifestyle", ""),
        "food_personality": lifestyle.get("food_personality", "none"),
        "social_pattern": lifestyle.get("social_pattern", "none"),

        # Risk
        "risk_score": risk.get("risk_score", 0),
        "risk_level": risk.get("risk_level", "safe"),
        "risk_flags": risk.get("risk_flags", {}),
        "risk_drivers": risk.get("risk_drivers", []),

        # Threshold
        "threshold_daily": threshold.get("daily", 0),
        "threshold_weekly": threshold.get("weekly", 0),
        "threshold_monthly": threshold.get("monthly", 0),

        # Compressor metadata
        "conflict_flags": conflict_flags,
        "conflict_details": conflict_details,
        "narrative_focus_hints": focus_hints,
        "data_maturity": data_maturity,
        "signal_confidence": signal_confidence,
    }

    return compressed
