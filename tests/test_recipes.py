"""Tests for recipe generation prioritizing expiring items."""
from datetime import datetime, timezone, timedelta


def test_recipe_generation_uses_expiring_items(client, user1_headers):
    # Add an expiring item
    exp_time = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    client.post("/api/items", json={
        "name": "Baby Spinach",
        "category": "vegetables",
        "quantity": 1,
        "expiry_date": exp_time
    }, headers=user1_headers)

    # Request recipe generation
    resp = client.post("/api/recipes/generate", json={"max_recipes": 2}, headers=user1_headers)
    assert resp.status_code == 200
    recipes = resp.json()
    assert len(recipes) >= 1
    r = recipes[0]
    assert "name" in r
    assert "time_minutes" in r
    assert "difficulty" in r
    assert "instructions" in r
    assert len(r["instructions"]) > 0
    # Recipe should identify the expiring item
    assert any("Spinach" in exp for exp in r.get("uses_expiring_items", [])) or "Spinach" in r["name"]
