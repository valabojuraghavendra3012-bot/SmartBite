"""Tests for analytics and waste tracking dashboard."""
from datetime import datetime, timezone, timedelta


def test_analytics_dashboard_metrics(client, user1_headers):
    # Create fresh item
    client.post("/api/items", json={
        "name": "Apples",
        "category": "fruits",
        "expiry_date": (datetime.now(timezone.utc) + timedelta(days=6)).isoformat()
    }, headers=user1_headers)

    # Create expiring item
    client.post("/api/items", json={
        "name": "Ripe Avocado",
        "category": "fruits",
        "expiry_date": (datetime.now(timezone.utc) + timedelta(hours=12)).isoformat()
    }, headers=user1_headers)

    # Create item and mark used
    res = client.post("/api/items", json={
        "name": "Tomatoes",
        "category": "vegetables",
        "expiry_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    }, headers=user1_headers)
    item_id = res.json()["id"]
    client.patch(f"/api/items/{item_id}/status", json={"action": "USED"}, headers=user1_headers)

    # Check dashboard stats
    analytics_resp = client.get("/api/analytics/dashboard", headers=user1_headers)
    assert analytics_resp.status_code == 200
    data = analytics_resp.json()
    assert data["total_items"] >= 2
    assert data["fresh_items"] >= 1
    assert data["expiring_items"] >= 1
    assert data["used_items"] >= 1
    assert "monthly_waste_trend" in data
    assert len(data["monthly_waste_trend"]) == 6
