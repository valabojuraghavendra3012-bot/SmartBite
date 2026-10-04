"""Freshness calculation utility."""
from datetime import datetime, timezone
from typing import Tuple
from app.models.schemas import FreshnessStatus


def calculate_freshness(expiry_date: datetime, reference_time: datetime = None) -> Tuple[FreshnessStatus, float, float]:
    """
    Calculate freshness status, hours remaining, and days remaining.
    Rules:
      - FRESH: more than 48 hours remaining (> 48h)
      - EXPIRING_SOON: between 0 and 48 hours remaining (0 <= hours <= 48)
      - EXPIRED: expiry time has passed (< 0)

    Returns:
      (FreshnessStatus, hours_remaining, days_remaining)
    """
    if reference_time is None:
        reference_time = datetime.now(timezone.utc)
    
    # Ensure both datetimes are timezone-aware in UTC for safe comparison
    if expiry_date.tzinfo is None:
        expiry_date = expiry_date.replace(tzinfo=timezone.utc)
    else:
        expiry_date = expiry_date.astimezone(timezone.utc)

    if reference_time.tzinfo is None:
        reference_time = reference_time.replace(tzinfo=timezone.utc)
    else:
        reference_time = reference_time.astimezone(timezone.utc)

    diff_seconds = (expiry_date - reference_time).total_seconds()
    hours_remaining = round(diff_seconds / 3600.0, 2)
    days_remaining = round(diff_seconds / 86400.0, 1)

    if hours_remaining < 0:
        status = FreshnessStatus.EXPIRED
    elif hours_remaining <= 48.0:
        status = FreshnessStatus.EXPIRING_SOON
    else:
        status = FreshnessStatus.FRESH

    return status, hours_remaining, days_remaining
