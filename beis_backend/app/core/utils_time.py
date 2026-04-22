"""Timestamp normalization: ISO, epoch, relative strings to UTC."""

from datetime import datetime, timezone, timedelta
from typing import Union


def normalize_timestamp(value: Union[str, int, float, datetime]) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    if isinstance(value, (int, float)):
        if value > 1e12:
            value = value / 1000
        return datetime.fromtimestamp(value, tz=timezone.utc)

    if isinstance(value, str):
        value = value.strip()

        # Relative strings
        now = datetime.now(timezone.utc)
        lower = value.lower()
        if lower == "today":
            return now.replace(hour=12, minute=0, second=0, microsecond=0)
        if lower == "yesterday":
            return (now - timedelta(days=1)).replace(hour=12, minute=0, second=0, microsecond=0)
        if lower == "this morning":
            return now.replace(hour=9, minute=0, second=0, microsecond=0)

        # Primary: Python's fromisoformat handles most ISO-8601 variants
        # including +05:30, Z suffix (Python 3.11+), etc.
        try:
            # Replace 'Z' with '+00:00' for Python < 3.11 compatibility
            iso_val = value.replace("Z", "+00:00") if value.endswith("Z") else value
            dt = datetime.fromisoformat(iso_val)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except (ValueError, TypeError):
            pass

        # Fallback: strptime for legacy formats
        for fmt in [
            "%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d",
        ]:
            try:
                dt = datetime.strptime(value, fmt)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc)
            except ValueError:
                continue

    raise ValueError(f"Cannot parse timestamp: {value}")

