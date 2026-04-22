"""
Identity Engine
================
Classifies primary + secondary spender identities from 12 archetypes.
Computes impulsivity index, self-control score, identity stability.
Architecture v2.0 Section 5.2 Step 5.
"""

from typing import Any, Dict

DISCRETIONARY = {"entertainment","shopping","dining_out","alcohol","clothing",
                 "electronics","travel","gifts","coffee","personal_care"}
ESSENTIAL = {"groceries","utilities","rent","transport","fuel","insurance",
             "emi","health","education","recharge"}
COMFORT = {"food","coffee","personal_care","subscriptions","shopping"}
STATUS = {"electronics","clothing","travel","dining_out"}


def run(brain: Dict[str, Any], memory: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Infer behavioral identity from brain stats.

    Args:
        brain: Output of behavioral_brain.run()
        memory: Previous behavioral memory (for stability comparison)
    """
    scores = {}
    cats = set(brain.get("top_categories", []))
    cv = brain.get("cv_ratio", 0)
    accel = brain.get("acceleration", 0)
    social = brain.get("social_ratio", 0)
    disc_ratio = brain.get("discretionary_ratio", 0)
    median = brain.get("median_txn", 0)
    std = brain.get("spend_std", 0)
    time_label = brain.get("time_pattern_label", "")
    time_pattern = brain.get("time_pattern", {})
    night_ratio = time_pattern.get("night", 0) + time_pattern.get("late_night", 0)

    # Score each archetype (0.0 to 1.0)
    # volatility_prone
    if cv > 0:
        scores["volatility_prone"] = min(cv / 1.5, 1.0)

    # high_discretionary_spender
    if disc_ratio > 0.3:
        scores["high_discretionary_spender"] = min(disc_ratio / 0.8, 1.0)

    # social_spender
    if social > 0.15:
        scores["social_spender"] = min(social / 0.7, 1.0)

    # spend_accelerating
    if accel > 0:
        scores["spend_accelerating"] = min(accel / 0.4, 1.0)

    # impulsive_spender
    if night_ratio > 0.2 and cv > 0.5:
        scores["impulsive_spender"] = min((night_ratio + cv) / 2.0, 1.0)

    # routine_spender
    if cv < 0.6 and abs(accel) < 0.1:
        scores["routine_spender"] = 1.0 - min(cv / 0.6, 1.0)

    # frugal_disciplined
    if median < 2000 and len(cats & ESSENTIAL) >= 2:
        scores["frugal_disciplined"] = min((2000 - median) / 2000 + 0.3, 1.0)

    # stress_spender
    if night_ratio > 0.25 and cv > 0.5:
        scores["stress_spender"] = min((night_ratio * 2 + cv) / 3.0, 1.0)

    # comfort_spender
    if len(cats & COMFORT) >= 2:
        scores["comfort_spender"] = min(len(cats & COMFORT) / 4.0, 1.0)

    # binge_spender
    if cv > 1.0 and accel > 0.1:
        scores["binge_spender"] = min((cv + accel) / 2.0, 1.0)

    # status_spender
    if len(cats & STATUS) >= 2 and median > 2000:
        scores["status_spender"] = min(median / 10000 + 0.3, 1.0)

    # reluctant_spender
    if cv < 0.4 and accel < -0.05:
        scores["reluctant_spender"] = min(abs(accel) / 0.3 + 0.2, 1.0)

    if not scores:
        scores["routine_spender"] = 0.3

    # Sort by score
    ranked = sorted(scores.items(), key=lambda x: -x[1])
    primary = ranked[0][0]
    secondary = [name for name, score in ranked[1:3] if score > 0.3]
    confidence = round(ranked[0][1], 2)

    # Impulsivity index (composite of night spending + variance + acceleration)
    impulsivity = round(min(
        (night_ratio * 0.4 + min(cv / 2, 0.3) + max(accel, 0) * 0.3), 1.0
    ), 2)
    self_control = round(1.0 - impulsivity * 0.8, 2)

    # Identity stability (compare with memory baseline)
    stability = "stable"
    if memory:
        prev_primary = memory.get("primary_identity", "")
        if prev_primary and prev_primary != primary:
            stability = "shifting"
        prev_scores = memory.get("identity_scores", {})
        if prev_scores:
            drift = sum(
                abs(scores.get(k, 0) - prev_scores.get(k, 0))
                for k in set(list(scores.keys()) + list(prev_scores.keys()))
            )
            if drift > 2.0:
                stability = "volatile"

    return {
        "primary_identity": primary,
        "secondary_identities": secondary,
        "identity_traits": [primary] + secondary,
        "identity_confidence": confidence,
        "identity_scores": {k: round(v, 2) for k, v in scores.items()},
        "impulsivity_index": impulsivity,
        "self_control_score": self_control,
        "identity_stability": stability,
    }
