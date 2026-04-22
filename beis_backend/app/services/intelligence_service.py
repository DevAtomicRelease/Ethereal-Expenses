"""
Intelligence Service (v3.0 -- MongoDB/Beanie)
===============================================
Full 13-step pipeline orchestrator.
Motor aggregation for 90-day window selection.
"""

import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import Any, Dict

from app.config import settings
from app.data.models import Transaction, IntelligenceResult, AnomalyLog
from app.memory import behavioral_memory as memory_mod
from app.engines import (
    behavioral_brain, identity_engine, anomaly_engine,
    behavior_shift_engine, momentum_engine, lifestyle_engine,
    risk_engine, adaptive_threshold_engine, behavioral_signal_compressor,
)
from app.core.model import generate_intelligence
from app.core.cache import get_cache, set_cache
from app.core.utils_serialization import make_serializable


async def run_pipeline(user_id: str) -> Dict[str, Any]:
    uid = str(user_id)

    # Cache check
    cached = await get_cache(uid, "intelligence")
    if cached:
        return cached

    # Step 1: Memory load
    mem = await memory_mod.load_memory(uid)
    stale = await memory_mod.is_stale(uid)

    # Step 2: Load transactions from MongoDB
    all_txns = await Transaction.find(
        Transaction.user_id == uid,
        Transaction.is_deleted == False,
    ).sort(-Transaction.timestamp).to_list()

    # Maturity check
    if len(all_txns) < settings.MIN_TRANSACTIONS:
        return {
            "status": "insufficient_data",
            "txn_count": len(all_txns),
            "required": settings.MIN_TRANSACTIONS,
            "progress_pct": round(len(all_txns) / settings.MIN_TRANSACTIONS * 100, 1),
        }

    # Step 3: Window selection (90-day)
    window_start = datetime.now(timezone.utc) - timedelta(days=settings.ANALYSIS_WINDOW_DAYS)
    windowed = [t for t in all_txns if t.timestamp >= window_start]
    if len(windowed) < settings.MIN_TRANSACTIONS:
        windowed = all_txns[:max(settings.MIN_TRANSACTIONS, len(all_txns))]

    df = _txns_to_df(windowed)

    # Step 4: Brain
    brain = behavioral_brain.run(df)

    # Rebuild memory if stale
    if stale or mem is None:
        version_hash = memory_mod.compute_version_hash(
            [{"id": str(t.id)} for t in all_txns]
        )
        await memory_mod.save_memory(uid, brain, version_hash)
        mem = brain

    # Steps 5-12: All engines
    identity = identity_engine.run(brain, memory=mem)
    anomaly = anomaly_engine.run(df, brain)
    shift = behavior_shift_engine.run(df)
    momentum = momentum_engine.run(df, brain)
    lifestyle = lifestyle_engine.run(df, brain)
    risk = risk_engine.run(brain, identity, anomaly, momentum, lifestyle, memory=mem)
    threshold = adaptive_threshold_engine.run(df, brain, risk)
    compressed = behavioral_signal_compressor.run(
        brain=brain, identity=identity, anomaly=anomaly, shift=shift,
        momentum=momentum, lifestyle=lifestyle, risk=risk, threshold=threshold,
    )

    # Persist anomaly detections to AnomalyLog
    if anomaly.get("anomalies_detected") and anomaly.get("anomalies"):
        for a in anomaly["anomalies"]:
            try:
                await AnomalyLog(
                    user_id=uid,
                    transaction_id=a.get("transaction_id"),
                    severity=a.get("severity", "mild"),
                    anomaly_type=a.get("anomaly_type", ""),
                    explanation=str(a.get("details", {})),
                ).insert()
            except Exception:
                pass

    # Step 13: LLM inference
    llm_result = await generate_intelligence(compressed)

    # Persist to intelligence_history
    await IntelligenceResult(
        user_id=uid,
        narrative=llm_result["narrative"],
        reasoning=llm_result.get("reasoning"),
        signals=make_serializable(compressed),
        data_maturity=compressed["data_maturity"],
        signal_confidence=compressed["signal_confidence"],
    ).insert()

    response = {
        "narrative": llm_result["narrative"],
        "reasoning": llm_result.get("reasoning"),
        "compressed_signals": make_serializable(compressed),
        "data_maturity": compressed["data_maturity"],
        "signal_confidence": compressed["signal_confidence"],
        "cached_at": datetime.now(timezone.utc).isoformat(),
        "model_unavailable": llm_result.get("model_unavailable", False),
    }

    await set_cache(uid, "intelligence", response, settings.CACHE_TTL_INTELLIGENCE)

    # Push WebSocket event: intelligence pipeline complete
    try:
        from app.websocket.handler import manager as ws_manager
        await ws_manager.send_to_user(uid, "intelligence_ready", {
            "cached_at": response["cached_at"],
            "data_maturity": response["data_maturity"],
            "anomaly_count": anomaly.get("anomaly_count", 0),
        })
    except Exception:
        pass

    return response


async def get_individual_engine(user_id: str, engine_name: str):
    uid = str(user_id)
    cached = await get_cache(uid, engine_name)
    if cached:
        return cached

    window_start = datetime.now(timezone.utc) - timedelta(days=settings.ANALYSIS_WINDOW_DAYS)
    txns = await Transaction.find(
        Transaction.user_id == uid,
        Transaction.is_deleted == False,
        Transaction.timestamp >= window_start,
    ).sort(-Transaction.timestamp).to_list()

    if len(txns) < settings.MIN_TRANSACTIONS:
        return None

    df = _txns_to_df(txns)
    brain = behavioral_brain.run(df)
    mem = await memory_mod.load_memory(uid)

    result = None
    ttl = 600

    if engine_name == "identity":
        result = identity_engine.run(brain, memory=mem)
        ttl = settings.CACHE_TTL_IDENTITY
    elif engine_name == "anomalies":
        result = anomaly_engine.run(df, brain)
        ttl = settings.CACHE_TTL_ANOMALIES
    elif engine_name == "behavior":
        result = behavior_shift_engine.run(df)
        ttl = settings.CACHE_TTL_BEHAVIOR
    elif engine_name == "momentum":
        result = momentum_engine.run(df, brain)
        ttl = settings.CACHE_TTL_MOMENTUM
    elif engine_name == "risk":
        identity = identity_engine.run(brain, memory=mem)
        anomaly = anomaly_engine.run(df, brain)
        momentum_r = momentum_engine.run(df, brain)
        lifestyle = lifestyle_engine.run(df, brain)
        result = risk_engine.run(brain, identity, anomaly, momentum_r, lifestyle, memory=mem)
        ttl = settings.CACHE_TTL_RISK
    elif engine_name == "thresholds":
        identity = identity_engine.run(brain, memory=mem)
        anomaly = anomaly_engine.run(df, brain)
        momentum_r = momentum_engine.run(df, brain)
        lifestyle = lifestyle_engine.run(df, brain)
        risk = risk_engine.run(brain, identity, anomaly, momentum_r, lifestyle, memory=mem)
        result = adaptive_threshold_engine.run(df, brain, risk)
        ttl = settings.CACHE_TTL_THRESHOLDS

    if result:
        await set_cache(uid, engine_name, make_serializable(result), ttl)
    return result


def _txns_to_df(txns) -> pd.DataFrame:
    if not txns:
        return pd.DataFrame(columns=["id", "timestamp", "amount", "category", "description"])
    records = [{
        "id": str(t.id),
        "timestamp": t.timestamp,
        "amount": float(t.amount),
        "category": t.category,
        "description": t.description or "",
    } for t in txns]
    df = pd.DataFrame(records)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    return df
