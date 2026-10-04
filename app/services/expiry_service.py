"""Expiry service for determining expiring items and continuous freshness monitoring."""
from datetime import datetime, timezone, timedelta
from typing import List
from sqlalchemy.orm import Session

from app.database import InventoryItem
from app.models.schemas import ItemResponse, ItemStatus, FreshnessStatus, UserContext
from app.services.inventory_service import InventoryService
from app.utils.freshness import calculate_freshness


class ExpiryService:
    def __init__(self, db: Session):
        self.db = db
        self.inventory_service = InventoryService(db)

    def get_expiring_items(self, user: UserContext, within_hours: int = 48) -> List[ItemResponse]:
        """
        Return active items expiring within the specified number of hours (default 48h).
        Does NOT rely on permanently stored status as the source of truth;
        freshness is evaluated dynamically against UTC now.
        """
        now_utc = datetime.now(timezone.utc)
        threshold_dt = now_utc + timedelta(hours=within_hours)

        items = self.db.query(InventoryItem).filter(
            InventoryItem.user_id == user.id,
            InventoryItem.status == ItemStatus.ACTIVE.value,
            InventoryItem.deleted_at.is_(None),
            InventoryItem.expiry_date <= threshold_dt
        ).order_by(InventoryItem.expiry_date.asc()).all()

        return [self.inventory_service._to_response(item) for item in items]
