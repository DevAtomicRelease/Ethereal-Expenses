"""Intelligence endpoints (v3 -- no db session parameter)."""

from fastapi import APIRouter, Depends, Query

from app.data.models import User, AnomalyLog
from app.dependencies import get_current_user
from app.services.intelligence_service import run_pipeline, get_individual_engine
from app.services.insight_service import get_insights

router = APIRouter(tags=["intelligence"])


@router.get("/intelligence")
async def intelligence(user: User = Depends(get_current_user)):
    try:
        return await run_pipeline(str(user.id))
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "detail": str(e),
            "narrative": None,
            "model_unavailable": True,
        }


@router.get("/insights")
async def insights(user: User = Depends(get_current_user)):
    return await get_insights(str(user.id))


@router.get("/anomalies")
async def anomalies(user: User = Depends(get_current_user)):
    result = await get_individual_engine(str(user.id), "anomalies")
    if result is None:
        return {"anomalies_detected": False, "anomaly_count": 0, "anomalies": [], "recurrence_flag": False}
    return result


@router.get("/behavior")
async def behavior(user: User = Depends(get_current_user)):
    result = await get_individual_engine(str(user.id), "behavior")
    if result is None:
        return {"shift_detected": False, "shift_type": "no_shift", "shift_magnitude_pct": 0}
    return result


@router.get("/risk")
async def risk(user: User = Depends(get_current_user)):
    result = await get_individual_engine(str(user.id), "risk")
    if result is None:
        return {"risk_score": 0, "risk_level": "safe", "risk_flags": {}, "risk_drivers": [], "risk_trend": None}
    return result


@router.get("/momentum")
async def momentum(user: User = Depends(get_current_user)):
    result = await get_individual_engine(str(user.id), "momentum")
    if result is None:
        return {"velocity": 0, "acceleration": 0, "direction": "stable", "category_drift": "stable",
                "reversal_signal": False, "projection_30d": 0}
    return result


@router.get("/identity")
async def identity(user: User = Depends(get_current_user)):
    result = await get_individual_engine(str(user.id), "identity")
    if result is None:
        return {"primary_identity": "unknown", "secondary_identities": [], "identity_confidence": 0,
                "impulsivity_index": 0, "self_control_score": 0, "identity_stability": "stable"}
    return result


@router.get("/thresholds")
async def thresholds(user: User = Depends(get_current_user)):
    result = await get_individual_engine(str(user.id), "thresholds")
    base = result if result else {"daily": 2000, "weekly": 10000, "monthly": 35000, "per_category": {}, "breach_days": []}

    # Merge user-defined goals from preferences
    user_goals = user.preferences.get("spending_goals", {})
    if user_goals.get("daily"):
        base["daily"] = user_goals["daily"]
    if user_goals.get("weekly"):
        base["weekly"] = user_goals["weekly"]
    if user_goals.get("monthly"):
        base["monthly"] = user_goals["monthly"]
    if user_goals.get("per_category"):
        merged = {**base.get("per_category", {}), **user_goals["per_category"]}
        base["per_category"] = merged

    return base


@router.put("/thresholds")
async def update_thresholds(
    req: dict,
    user: User = Depends(get_current_user),
):
    """Save user-defined spending goals to preferences."""
    goals = {}
    if "daily" in req:
        goals["daily"] = float(req["daily"])
    if "weekly" in req:
        goals["weekly"] = float(req["weekly"])
    if "monthly" in req:
        goals["monthly"] = float(req["monthly"])
    if "per_category" in req and isinstance(req["per_category"], dict):
        goals["per_category"] = {k: float(v) for k, v in req["per_category"].items()}

    user.preferences["spending_goals"] = goals
    await user.save()

    # Invalidate cache
    from app.core.cache import invalidate_user_cache
    await invalidate_user_cache(str(user.id))

    return {"status": "ok", **goals}


@router.get("/anomalies/history")
async def anomaly_history(
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
):
    """Return persisted anomaly log entries for historical trend analysis."""
    uid = str(user.id)
    logs = await AnomalyLog.find(
        AnomalyLog.user_id == uid,
    ).sort(-AnomalyLog.detected_at).limit(limit).to_list()

    return {
        "anomaly_logs": [
            {
                "id": str(log.id),
                "transaction_id": log.transaction_id,
                "severity": log.severity,
                "anomaly_type": log.anomaly_type,
                "explanation": log.explanation,
                "detected_at": log.detected_at.isoformat(),
            }
            for log in logs
        ],
        "total": len(logs),
    }
