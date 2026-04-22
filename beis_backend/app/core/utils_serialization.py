"""JSON serializer for numpy, pandas, datetime, ObjectId."""

import json
from datetime import datetime, date
from decimal import Decimal

import numpy as np


class BEISEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        if hasattr(obj, "__str__") and "ObjectId" in type(obj).__name__:
            return str(obj)
        return super().default(obj)


def make_serializable(data):
    """Convert any nested structure to JSON-safe types."""
    if isinstance(data, dict):
        return {k: make_serializable(v) for k, v in data.items()}
    if isinstance(data, (list, tuple)):
        return [make_serializable(v) for v in data]
    if isinstance(data, (np.integer,)):
        return int(data)
    if isinstance(data, (np.floating,)):
        return float(data)
    if isinstance(data, np.ndarray):
        return data.tolist()
    if isinstance(data, (datetime, date)):
        return data.isoformat()
    if isinstance(data, Decimal):
        return float(data)
    if hasattr(data, "__str__") and "ObjectId" in type(data).__name__:
        return str(data)
    return data
