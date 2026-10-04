"""Tests for inventory items management and strict user isolation."""
from datetime import datetime, timezone, timedelta


def test_create_item_and_freshness_calculation(client, user1_headers):
    # Expiry 3 days in future -> FRESH
    future_expiry = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    payload = {
        "name": "Fresh Organic Milk",
        "quantity": 2.0,
        "unit": "carton",
        "category": "dairy",
        "expiry_date": future_expiry,
        "storage_location": "Fridge"
    }
    resp = client.post("/api/items", json=payload, headers=user1_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Fresh Organic Milk"
    assert data["quantity"] == 2.0
    assert data["freshness_status"] == "FRESH"
    assert data["days_remaining"] >= 2.9


def test_item_retrieval_and_filtering(client, user1_headers):
    # Add a dairy item and vegetable item
    client.post("/api/items", json={
        "name": "Yogurt",
        "category": "dairy",
        "quantity": 1,
        "expiry_date": (datetime.now(timezone.utc) + timedelta(hours=20)).isoformat()
    }, headers=user1_headers)

    client.post("/api/items", json={
        "name": "Carrots",
        "category": "vegetables",
        "quantity": 5,
        "expiry_date": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    }, headers=user1_headers)

    # Filter by category=dairy
    resp = client.get("/api/items?category=dairy", headers=user1_headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert all(i["category"] == "dairy" for i in items)

    # Filter by status=expiring
    resp_exp = client.get("/api/items?status=expiring", headers=user1_headers)
    assert resp_exp.status_code == 200
    exp_items = resp_exp.json()["items"]
    assert any("Yogurt" in i["name"] for i in exp_items)


def test_update_item_status_creates_event(client, user1_headers):
    # Create item
    res = client.post("/api/items", json={
        "name": "Spinach Bunch",
        "category": "vegetables",
        "quantity": 1,
        "expiry_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    }, headers=user1_headers)
    item_id = res.json()["id"]

    # Mark as used
    status_resp = client.patch(f"/api/items/{item_id}/status", json={"action": "USED"}, headers=user1_headers)
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "USED"

    # Active items query should no longer return used item
    active_resp = client.get("/api/items", headers=user1_headers)
    active_ids = [i["id"] for i in active_resp.json()["items"]]
    assert item_id not in active_ids


def test_delete_item(client, user1_headers):
    res = client.post("/api/items", json={
        "name": "Old Bread",
        "category": "bakery",
        "quantity": 1,
        "expiry_date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    }, headers=user1_headers)
    item_id = res.json()["id"]

    del_resp = client.delete(f"/api/items/{item_id}", headers=user1_headers)
    assert del_resp.status_code == 204

    # Getting deleted item returns 404
    get_resp = client.get(f"/api/items/{item_id}", headers=user1_headers)
    assert get_resp.status_code == 404


def test_user_isolation(client, user1_headers, user2_headers):
    # User 1 creates an item
    res = client.post("/api/items", json={
        "name": "User 1 Secret Recipe Cheese",
        "category": "dairy",
        "quantity": 1,
        "expiry_date": (datetime.now(timezone.utc) + timedelta(days=4)).isoformat()
    }, headers=user1_headers)
    item_id = res.json()["id"]

    # User 2 attempts to get User 1's item
    res_user2 = client.get(f"/api/items/{item_id}", headers=user2_headers)
    assert res_user2.status_code == 404

    # User 2 attempts to update User 1's item
    update_user2 = client.put(f"/api/items/{item_id}", json={"name": "Hacked"}, headers=user2_headers)
    assert update_user2.status_code == 404

    # User 2 list should NOT contain User 1's item
    list_user2 = client.get("/api/items", headers=user2_headers)
    user2_item_ids = [i["id"] for i in list_user2.json()["items"]]
    assert item_id not in user2_item_ids
