"""
Risk Engine
============
Produces 0-100 risk score with 7 boolean flags.
Weights: volatility 30%, acceleration 25%, anomaly cluster 20%,
         lifestyle inflation 15%, budget breach 10%.
Architecture v2.0 Section 5.2 Step 10.
"""

from typing import Any, Dict


def run(
    brain: Dict[str, Any],
    identity: Dict[str, Any],
    anomaly: Dict[str, Any],
    momentum: Dict[str, Any],
    lifestyle: Dict[str, Any],
    memory: Dict[str, Any] = None,
) -> Dict[str, Any]:
    """
    Compute composite risk score from all engine outputs.

    Weights (architecture spec):
        volatility     30%
        acceleration   25%
        anomaly        20%
        lifestyle      15%
        budget breach  10%
    """
    risk_raw = 0.0
    flags = {}
    drivers = []

    # ── Volatility (30%) ──
    cv = brain.get("cv_ratio", 0)
    vol_score = min(cv / 1.5, 1.0)
    flags["high_volatility"] = vol_score > 0.5
    if flags["high_volatility"]:
        drivers.append("volatility")
    risk_raw += vol_score * 30

    # ── Acceleration (25%) ──
    accel = momentum.get("acceleration", 0)
    acc_score = max(accel, 0) / 0.45
    flags["rapid_acceleration"] = acc_score > 0.4
    if flags["rapid_acceleration"]:
        drivers.append("acceleration")
    risk_raw += min(acc_score, 1.0) * 25

    # ── Anomaly cluster (20%) ──
    anom_count = anomaly.get("anomaly_count", 0)
    anom_score = min(anom_count / 4, 1.0)
    flags["anomaly_cluster"] = anom_count >= 2
    if flags["anomaly_cluster"]:
        drivers.append("anomaly_cluster")
    risk_raw += anom_score * 20

    # ── Lifestyle inflation (15%) ──
    disc_ratio = brain.get("discretionary_ratio", 0)
    flags["lifestyle_inflation"] = disc_ratio > 0.6 and accel > 0.05
    if flags["lifestyle_inflation"]:
        drivers.append("lifestyle_inflation")
    inflation_mult = 1.5 if flags["lifestyle_inflation"] else 1.0
    risk_raw += min(disc_ratio, 1.0) * 15 * inflation_mult

    # ── Budget breach (10%) ──
    anomaly_types = anomaly.get("anomaly_types", [])
    flags["budget_breach"] = "threshold_breach" in anomaly_types
    if flags["budget_breach"]:
        drivers.append("budget_breach")
        risk_raw += 10

    # ── Additional flags ──
    flags["recurring_anomaly"] = anomaly.get("recurrence_flag", False)
    if flags["recurring_anomaly"]:
        drivers.append("recurring_anomaly")

    flags["identity_unstable"] = identity.get("identity_stability") == "volatile"
    if flags["identity_unstable"]:
        drivers.append("identity_unstable")

    # ── Clamp to 0-100 ──
    risk_score = int(min(max(risk_raw, 0), 100))

    # ── Level classification ──
    if risk_score < 25:
        risk_level = "safe"
    elif risk_score < 50:
        risk_level = "watch"
    elif risk_score < 75:
        risk_level = "concern"
    else:
        risk_level = "danger"

    # ── Trend vs memory baseline ──
    risk_trend = None
    if memory:
        prev_score = memory.get("risk_score", None)
        if prev_score is not None:
            diff = risk_score - prev_score
            if diff > 10:
                risk_trend = "worsening"
            elif diff < -10:
                risk_trend = "improving"
            else:
                risk_trend = "stable"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risk_flags": flags,
        "risk_drivers": drivers,
        "risk_trend": risk_trend,
    }
