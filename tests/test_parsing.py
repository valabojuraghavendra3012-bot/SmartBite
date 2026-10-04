"""Tests for natural language date and item parsing."""
from datetime import datetime, timezone, timedelta
from app.utils.date_parser import parse_natural_item_text, parse_date_expression
from app.models.schemas import ExpirySource


def test_parse_explicit_date_expression():
    ref_date = datetime(2026, 10, 4, tzinfo=timezone.utc).date()
    
    # "Oct 12"
    d, conf = parse_date_expression("Milk - Oct 12", reference_date=ref_date)
    assert d is not None
    assert d.month == 10
    assert d.day == 12
    assert conf >= 0.95

    # "tomorrow"
    d_tomorrow, conf_t = parse_date_expression("Spinach expires tomorrow", reference_date=ref_date)
    assert d_tomorrow == ref_date + timedelta(days=1)


def test_parse_natural_item_text_variations():
    # Example 1: "2 milk packets expire Oct 12"
    items1 = parse_natural_item_text("2 milk packets expire Oct 12")
    assert len(items1) == 1
    item1 = items1[0]
    assert "Milk" in item1.name
    assert item1.quantity == 2.0
    assert item1.category == "dairy"
    assert item1.expiry_date == "2026-10-12"
    assert item1.expiry_source == ExpirySource.USER_PROVIDED
    assert item1.confidence >= 0.85

    # Example 2: "Eggs 12, expiry Oct 15"
    items2 = parse_natural_item_text("Eggs 12, expiry Oct 15")
    assert len(items2) == 1
    item2 = items2[0]
    assert "Eggs" in item2.name
    assert item2.quantity == 12.0
    assert item2.category == "dairy"
    assert item2.expiry_date == "2026-10-15"

    # Example 3: "Spinach expires tomorrow"
    items3 = parse_natural_item_text("Spinach expires tomorrow")
    assert len(items3) == 1
    assert "Spinach" in items3[0].name
    assert items3[0].category == "vegetables"


def test_shelf_life_default_when_no_date_provided():
    # User provides item name without date
    items = parse_natural_item_text("Whole Milk")
    assert len(items) == 1
    item = items[0]
    assert "Milk" in item.name
    assert item.expiry_source == ExpirySource.ESTIMATED
    assert item.expiry_date is not None
    # Confidence is clearly marked lower to reflect estimation
    assert item.confidence < 0.85
