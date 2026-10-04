"""Tests for freshness calculations and boundary rules."""
from datetime import datetime, timezone, timedelta
from app.utils.freshness import calculate_freshness
from app.models.schemas import FreshnessStatus


def test_fresh_item_calculation():
    now = datetime(2026, 10, 4, 12, 0, 0, tzinfo=timezone.utc)
    # Expiry 3 days away (72 hours > 48h)
    expiry = now + timedelta(days=3)
    status, hours, days = calculate_freshness(expiry, reference_time=now)
    assert status == FreshnessStatus.FRESH
    assert hours == 72.0
    assert days == 3.0


def test_expiring_soon_item_calculation():
    now = datetime(2026, 10, 4, 12, 0, 0, tzinfo=timezone.utc)
    # Expiry in 30 hours (between 0 and 48 hours)
    expiry = now + timedelta(hours=30)
    status, hours, days = calculate_freshness(expiry, reference_time=now)
    assert status == FreshnessStatus.EXPIRING_SOON
    assert hours == 30.0

    # Boundary test: exactly 48 hours
    boundary_48 = now + timedelta(hours=48)
    status_48, _, _ = calculate_freshness(boundary_48, reference_time=now)
    assert status_48 == FreshnessStatus.EXPIRING_SOON

    # Boundary test: exactly 0 hours
    boundary_0 = now
    status_0, _, _ = calculate_freshness(boundary_0, reference_time=now)
    assert status_0 == FreshnessStatus.EXPIRING_SOON


def test_expired_item_calculation():
    now = datetime(2026, 10, 4, 12, 0, 0, tzinfo=timezone.utc)
    # Expiry 2 hours in the past
    past_expiry = now - timedelta(hours=2)
    status, hours, days = calculate_freshness(past_expiry, reference_time=now)
    assert status == FreshnessStatus.EXPIRED
    assert hours < 0
