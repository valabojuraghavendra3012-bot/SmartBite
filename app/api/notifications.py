"""Notification endpoints for expiry alerts and system updates."""
from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.schemas import NotificationResponse, UserContext
from app.api.auth import get_current_user
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse], summary="Get user notifications")
def get_notifications(
    limit: int = Query(50, ge=1, le=100),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = NotificationService(db)
    return service.get_user_notifications(current_user, limit=limit)


@router.patch("/{notification_id}/read", response_model=NotificationResponse, summary="Mark notification as read")
def mark_read(
    notification_id: str,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = NotificationService(db)
    return service.mark_as_read(notification_id, current_user)


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete notification")
def delete_notification(
    notification_id: str,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = NotificationService(db)
    service.delete_notification(notification_id, current_user)
