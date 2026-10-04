"""Notification service with idempotency guarantees to prevent duplicate alerts."""
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.database import Notification, InventoryItem
from app.models.schemas import NotificationResponse, NotificationType, UserContext


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def _to_response(self, n: Notification) -> NotificationResponse:
        return NotificationResponse(
            id=n.id,
            user_id=n.user_id,
            inventory_item_id=n.inventory_item_id,
            type=NotificationType(n.type),
            title=n.title,
            message=n.message,
            scheduled_for=n.scheduled_for,
            read_at=n.read_at,
            read=bool(n.read_at is not None),
            created_at=n.created_at
        )

    def create_notification_if_not_exists(
        self,
        user_id: str,
        item_id: str,
        notif_type: NotificationType,
        title: str,
        message: str
    ) -> Optional[NotificationResponse]:
        """
        Idempotent notification creation.
        If a notification for the (item_id, notif_type) already exists, skip it.
        """
        existing = self.db.query(Notification).filter(
            Notification.inventory_item_id == item_id,
            Notification.type == notif_type.value
        ).first()

        if existing:
            return None

        try:
            notification = Notification(
                user_id=user_id,
                inventory_item_id=item_id,
                type=notif_type.value,
                title=title,
                message=message,
                scheduled_for=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc)
            )
            self.db.add(notification)
            self.db.commit()
            self.db.refresh(notification)
            return self._to_response(notification)
        except IntegrityError:
            self.db.rollback()
            return None

    def get_user_notifications(self, user: UserContext, limit: int = 50) -> List[NotificationResponse]:
        notifications = self.db.query(Notification).filter(
            Notification.user_id == user.id
        ).order_by(Notification.created_at.desc()).limit(limit).all()

        return [self._to_response(n) for n in notifications]

    def mark_as_read(self, notification_id: str, user: UserContext) -> NotificationResponse:
        n = self.db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user.id
        ).first()

        if not n:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notification '{notification_id}' not found."
            )

        n.read_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(n)
        return self._to_response(n)

    def delete_notification(self, notification_id: str, user: UserContext) -> None:
        n = self.db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user.id
        ).first()

        if not n:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notification '{notification_id}' not found."
            )

        self.db.delete(n)
        self.db.commit()
