"""Background job to check inventory expiry status and dispatch idempotent notifications."""
import logging
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

from app.database import SessionLocal, InventoryItem, NotificationPreference
from app.models.schemas import NotificationType, ItemStatus
from app.services.notification_service import NotificationService
from app.utils.freshness import calculate_freshness

logger = logging.getLogger(__name__)


def check_expiries():
    """
    Periodic job that checks active inventory items for upcoming or passed expiry.
    Dispatches EXPIRY_48H, EXPIRY_24H, or EXPIRED notifications.
    Enforces idempotency: an item will never receive the same notification type twice.
    """
    db: Session = SessionLocal()
    try:
        now_utc = datetime.now(timezone.utc)
        items = db.query(InventoryItem).filter(
            InventoryItem.status == ItemStatus.ACTIVE.value,
            InventoryItem.deleted_at.is_(None)
        ).all()

        notif_service = NotificationService(db)

        for item in items:
            status, hours_remaining, days_remaining = calculate_freshness(item.expiry_date, reference_time=now_utc)
            
            # Check user notification preferences if set
            pref = db.query(NotificationPreference).filter(
                NotificationPreference.user_id == item.user_id
            ).first()

            if 24.0 < hours_remaining <= 48.0:
                if pref is None or pref.enable_48h:
                    notif_service.create_notification_if_not_exists(
                        user_id=item.user_id,
                        item_id=item.id,
                        notif_type=NotificationType.EXPIRY_48H,
                        title=f"{item.name} is coming up soon",
                        message=f"{item.name} expires in about 2 days ({item.expiry_date.strftime('%b %d')}). Plan a meal or find a recipe."
                    )
            elif 0.0 <= hours_remaining <= 24.0:
                if pref is None or pref.enable_24h:
                    notif_service.create_notification_if_not_exists(
                        user_id=item.user_id,
                        item_id=item.id,
                        notif_type=NotificationType.EXPIRY_24H,
                        title=f"{item.name} expires today or tomorrow",
                        message=f"Use, donate, or freeze your {item.name} before it expires."
                    )
            elif hours_remaining < 0.0:
                notif_service.create_notification_if_not_exists(
                    user_id=item.user_id,
                    item_id=item.id,
                    notif_type=NotificationType.EXPIRED,
                    title=f"{item.name} has passed its expiry date",
                    message=f"{item.name} expired on {item.expiry_date.strftime('%b %d')}. Check before deciding what to do."
                )

    except Exception as e:
        logger.error(f"Error during expiry check job: {e}")
    finally:
        db.close()


scheduler = AsyncIOScheduler()


def start_expiry_scheduler(interval_minutes: int = 30):
    """Start the periodic background scheduler."""
    if not scheduler.running:
        scheduler.add_job(check_expiries, "interval", minutes=interval_minutes, id="expiry_checker")
        scheduler.start()
        logger.info(f"Expiry checker scheduler started with {interval_minutes}m interval.")


def shutdown_expiry_scheduler():
    """Shutdown background scheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Expiry checker scheduler shut down.")
