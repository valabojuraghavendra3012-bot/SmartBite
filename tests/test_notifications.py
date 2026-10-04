"""Tests for notification alerts and duplicate prevention."""
from app.services.notification_service import NotificationService
from app.models.schemas import NotificationType, UserContext


def test_duplicate_notification_prevention(client, db_session, user1_headers):
    # Create item
    res = client.post("/api/items", json={
        "name": "Almond Milk",
        "category": "dairy",
        "quantity": 1
    }, headers=user1_headers)
    item_id = res.json()["id"]

    service = NotificationService(db_session)
    user_id = res.json()["user_id"]

    # First notification dispatch: EXPIRY_48H
    notif1 = service.create_notification_if_not_exists(
        user_id=user_id,
        item_id=item_id,
        notif_type=NotificationType.EXPIRY_48H,
        title="Almond Milk is expiring",
        message="Expires in 2 days"
    )
    assert notif1 is not None

    # Attempt second dispatch of same notification type on same item
    notif2 = service.create_notification_if_not_exists(
        user_id=user_id,
        item_id=item_id,
        notif_type=NotificationType.EXPIRY_48H,
        title="Almond Milk is expiring again",
        message="Expires in 2 days"
    )
    # Must be None due to idempotency / unique constraint
    assert notif2 is None


def test_mark_notification_read_and_delete(client, db_session, user1_headers):
    res = client.post("/api/items", json={"name": "Butter", "category": "dairy"}, headers=user1_headers)
    item_id = res.json()["id"]
    user_id = res.json()["user_id"]

    service = NotificationService(db_session)
    n = service.create_notification_if_not_exists(
        user_id=user_id,
        item_id=item_id,
        notif_type=NotificationType.EXPIRY_24H,
        title="Butter expires soon",
        message="Use it today!"
    )
    assert n is not None

    # Mark as read
    patch_resp = client.patch(f"/api/notifications/{n.id}/read", headers=user1_headers)
    assert patch_resp.status_code == 200
    assert patch_resp.json()["read"] is True

    # Delete
    del_resp = client.delete(f"/api/notifications/{n.id}", headers=user1_headers)
    assert del_resp.status_code == 204
