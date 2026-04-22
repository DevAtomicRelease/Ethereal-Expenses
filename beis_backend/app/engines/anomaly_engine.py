"""
Anomaly Engine
===============
IQR outlier detection, daily spike analysis, category surge,
threshold breach, frequency anomaly, recurrence check.
Architecture v2.0: DISABLED below 30 transactions.
"""

import pandas as pd
import numpy as np
from typing import Any, Dict, List
from datetime import timedelta

from app.config import settings


def run(df: pd.DataFrame, brain: Dict[str, Any], thresholds: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Detect spending anomalies in the 90-day window.

    Args:
        df: Transaction DataFrame (90-day window)
        brain: Output of behavioral_brain.run()
        thresholds: Output of adaptive_threshold_engine.run() (optional)
    """
    n = brain.get("txn_count", len(df))

    # FIX 3: Architecture spec — anomaly detection disabled below 30 transactions
    if n < settings.ANOMALY_MIN_TRANSACTIONS:
        return {
            "anomalies_detected": False,
            "anomaly_count": 0,
            "anomalies": [],
            "recurrence_flag": False,
            "disabled_reason": f"Requires {settings.ANOMALY_MIN_TRANSACTIONS}+ transactions (have {n})",
        }

    amounts = df["amount"].astype(float)
    anomalies: List[Dict] = []

    # ── 1. IQR Outlier Detection ──
    q1 = amounts.quantile(0.25)
    q3 = amounts.quantile(0.75)
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr

    outliers = df[amounts > upper]
    for _, row in outliers.iterrows():
        ratio = float(row["amount"]) / brain["median_txn"] if brain["median_txn"] > 0 else 0
        severity = "severe" if ratio > 5 else ("moderate" if ratio > 3 else "mild")
        anomalies.append({
            "anomaly_type": "iqr_outlier",
            "severity": severity,
            "transaction_id": str(row.get("id", "")),
            "details": {
                "amount": float(row["amount"]),
                "upper_bound": round(upper, 2),
                "ratio_to_median": round(ratio, 2),
            },
        })

    # ── 2. Extreme Transaction Ratio ──
    if brain["median_txn"] > 0:
        extreme = df[amounts > brain["median_txn"] * 5]
        for _, row in extreme.iterrows():
            # Avoid duplicating with IQR
            tid = str(row.get("id", ""))
            if not any(a["transaction_id"] == tid and a["anomaly_type"] == "extreme_transaction_ratio" for a in anomalies):
                anomalies.append({
                    "anomaly_type": "extreme_transaction_ratio",
                    "severity": "severe",
                    "transaction_id": tid,
                    "details": {
                        "amount": float(row["amount"]),
                        "median": brain["median_txn"],
                        "ratio": round(float(row["amount"]) / brain["median_txn"], 2),
                    },
                })

    # ── 3. Daily Spending Spike ──
    df_copy = df.copy()
    df_copy["date"] = pd.to_datetime(df_copy["timestamp"]).dt.date
    daily_totals = df_copy.groupby("date")["amount"].sum().astype(float)

    if len(daily_totals) > 7:
        daily_mean = daily_totals.mean()
        daily_std = daily_totals.std()
        spike_threshold = daily_mean + 2.5 * daily_std

        spike_days = daily_totals[daily_totals > spike_threshold]
        for day, total in spike_days.items():
            severity = "severe" if total > daily_mean * 4 else ("moderate" if total > daily_mean * 3 else "mild")
            anomalies.append({
                "anomaly_type": "daily_spending_spike",
                "severity": severity,
                "transaction_id": None,
                "details": {
                    "date": str(day),
                    "daily_total": round(total, 2),
                    "daily_average": round(daily_mean, 2),
                    "multiplier": round(total / daily_mean, 2) if daily_mean > 0 else 0,
                },
            })

    # ── 4. Category Surge ──
    if len(df) > 10:
        cat_totals = df.groupby("category")["amount"].sum().astype(float)
        cat_means = df.groupby("category")["amount"].mean().astype(float)

        # Compare last 7 days vs full window per category
        now = pd.Timestamp.now("UTC")
        recent = df[pd.to_datetime(df["timestamp"]) >= now - timedelta(days=7)]
        if not recent.empty:
            recent_cat = recent.groupby("category")["amount"].sum().astype(float)
            full_cat_weekly = cat_totals / max(len(daily_totals) / 7, 1)

            for cat in recent_cat.index:
                if cat in full_cat_weekly.index and full_cat_weekly[cat] > 0:
                    ratio = recent_cat[cat] / full_cat_weekly[cat]
                    if ratio > 2.5:
                        severity = "severe" if ratio > 5 else ("moderate" if ratio > 3 else "mild")
                        anomalies.append({
                            "anomaly_type": "category_surge",
                            "severity": severity,
                            "transaction_id": None,
                            "details": {
                                "category": cat,
                                "recent_7d": round(float(recent_cat[cat]), 2),
                                "weekly_average": round(float(full_cat_weekly[cat]), 2),
                                "surge_ratio": round(ratio, 2),
                            },
                        })

    # ── 5. Threshold Breach ──
    if thresholds:
        daily_limit = thresholds.get("daily", 0)
        if daily_limit > 0 and len(daily_totals) > 0:
            breach_days = daily_totals[daily_totals > daily_limit]
            for day, total in breach_days.items():
                anomalies.append({
                    "anomaly_type": "threshold_breach",
                    "severity": "moderate" if total < daily_limit * 1.5 else "severe",
                    "transaction_id": None,
                    "details": {
                        "date": str(day),
                        "daily_total": round(total, 2),
                        "threshold": round(daily_limit, 2),
                        "overage_pct": round((total / daily_limit - 1) * 100, 1),
                    },
                })

    # ── 6. Frequency Anomaly ──
    if len(df) > 14:
        df_copy["hour_block"] = pd.to_datetime(df_copy["timestamp"]).dt.floor("6h")
        block_counts = df_copy.groupby("hour_block").size()
        if len(block_counts) > 4:
            block_mean = block_counts.mean()
            block_std = block_counts.std()
            freq_threshold = block_mean + 2.5 * block_std
            freq_spikes = block_counts[block_counts > freq_threshold]
            for block, count in freq_spikes.items():
                anomalies.append({
                    "anomaly_type": "frequency_anomaly",
                    "severity": "moderate",
                    "transaction_id": None,
                    "details": {
                        "time_block": str(block),
                        "txn_count": int(count),
                        "average_per_block": round(block_mean, 1),
                    },
                })

    # ── Recurrence check ──
    type_counts = {}
    for a in anomalies:
        t = a["anomaly_type"]
        type_counts[t] = type_counts.get(t, 0) + 1
    recurrence = any(c >= 2 for c in type_counts.values())

    # Worst severity
    severity_order = {"clean": 0, "mild": 1, "moderate": 2, "severe": 3}
    worst = "clean"
    for a in anomalies:
        if severity_order.get(a["severity"], 0) > severity_order.get(worst, 0):
            worst = a["severity"]

    return {
        "anomalies_detected": len(anomalies) > 0,
        "anomaly_count": len(anomalies),
        "anomalies": anomalies,
        "anomaly_severity": worst,
        "anomaly_types": list(type_counts.keys()),
        "recurrence_flag": recurrence,
    }
