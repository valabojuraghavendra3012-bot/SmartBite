"""Tests for authentication and token validation."""
import pytest


def test_unauthenticated_request_rejected(client):
    # Calling protected endpoint without token
    resp = client.get("/api/items")
    assert resp.status_code == 401
    assert "detail" in resp.json()


def test_authenticated_request_success(client, user1_headers):
    resp = client.get("/api/items", headers=user1_headers)
    assert resp.status_code == 200
    assert "items" in resp.json()
