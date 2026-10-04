"""Service layer for inventory management and user-isolated data operations."""
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from fastapi import HTTPException, status

from app.database import InventoryItem, InventoryEvent, Profile, FoodCategory
from app.models.schemas import (
    ItemCreate, ItemUpdate, ItemResponse, ItemStatus,
    FreshnessStatus, ExpirySource, UserContext
)
from app.utils.freshness import calculate_freshness
from app.utils.date_parser import infer_category, get_default_shelf_life


class InventoryService:
    def __init__(self, db: Session):
        self.db = db

    def _ensure_profile_exists(self, user: UserContext):
        """Ensure local profile record exists for foreign key references."""
        profile = self.db.query(Profile).filter(Profile.id == user.id).first()
        if not profile:
            profile = Profile(
                id=user.id,
                email=user.email or f"{user.id}@smartbite.local",
                full_name=user.full_name or "SmartBite Chef"
            )
            self.db.add(profile)
            self.db.commit()

    def _to_response(self, item: InventoryItem) -> ItemResponse:
        status, hours_remaining, days_remaining = calculate_freshness(item.expiry_date)
        return ItemResponse(
            id=item.id,
            user_id=item.user_id,
            name=item.name,
            category=item.category_name or "other",
            quantity=item.quantity,
            unit=item.unit,
            purchase_date=item.purchase_date,
            expiry_date=item.expiry_date,
            expiry_source=ExpirySource(item.expiry_source),
            storage_location=item.storage_location,
            notes=item.notes,
            status=ItemStatus(item.status),
            created_at=item.created_at,
            updated_at=item.updated_at,
            freshness_status=status,
            days_remaining=days_remaining,
            hours_remaining=hours_remaining,
            weight_kg=item.weight_kg,
        )

    def create_item(self, data: ItemCreate, user: UserContext) -> ItemResponse:
        self._ensure_profile_exists(user)
        
        # Categorize
        cat_name = (data.category or infer_category(data.name)).lower()
        category_rec = self.db.query(FoodCategory).filter(FoodCategory.name == cat_name).first()
        category_id = category_rec.id if category_rec else None

        # Expiry date & source
        if data.expiry_date:
            expiry_dt = data.expiry_date
            if expiry_dt.tzinfo is None:
                expiry_dt = expiry_dt.replace(tzinfo=timezone.utc)
            expiry_source = ExpirySource.USER_PROVIDED.value
        else:
            shelf_days = get_default_shelf_life(data.name, cat_name)
            expiry_dt = datetime.now(timezone.utc) + timedelta(days=shelf_days)
            expiry_source = ExpirySource.ESTIMATED.value

        item = InventoryItem(
            user_id=user.id,
            name=data.name.strip(),
            category_id=category_id,
            category_name=cat_name,
            quantity=data.quantity,
            unit=data.unit,
            purchase_date=data.purchase_date or date.today(),
            expiry_date=expiry_dt,
            expiry_source=expiry_source,
            storage_location=data.storage_location or "Fridge",
            notes=data.notes,
            weight_kg=data.weight_kg,
            status=ItemStatus.ACTIVE.value
        )
        self.db.add(item)
        self.db.flush()

        # Log item ADDED event
        event = InventoryEvent(
            user_id=user.id,
            inventory_item_id=item.id,
            event_type="ADDED",
            quantity=item.quantity
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(item)

        return self._to_response(item)

    def get_items(
        self,
        user: UserContext,
        search: Optional[str] = None,
        category: Optional[str] = None,
        status_filter: Optional[str] = None,
        sort_by: str = "expiry_date",
        sort_order: str = "asc",
        page: int = 1,
        page_size: int = 50,
        active_only: bool = True
    ) -> Tuple[List[ItemResponse], int]:
        query = self.db.query(InventoryItem).filter(
            InventoryItem.user_id == user.id,
            InventoryItem.deleted_at.is_(None)
        )

        if active_only:
            query = query.filter(InventoryItem.status == ItemStatus.ACTIVE.value)

        if search:
            query = query.filter(InventoryItem.name.ilike(f"%{search.strip()}%"))

        if category:
            query = query.filter(InventoryItem.category_name == category.strip().lower())

        # Dynamic freshness status filter
        now_utc = datetime.now(timezone.utc)
        if status_filter:
            sf = status_filter.strip().upper()
            if sf == "FRESH":
                query = query.filter(InventoryItem.expiry_date > (now_utc + timedelta(hours=48)))
            elif sf in ("EXPIRING", "EXPIRING_SOON"):
                query = query.filter(
                    InventoryItem.expiry_date <= (now_utc + timedelta(hours=48)),
                    InventoryItem.expiry_date >= now_utc
                )
            elif sf == "EXPIRED":
                query = query.filter(InventoryItem.expiry_date < now_utc)

        # Sorting
        sort_col = getattr(InventoryItem, sort_by, InventoryItem.expiry_date)
        if sort_order.lower() == "desc":
            query = query.order_by(desc(sort_col))
        else:
            query = query.order_by(asc(sort_col))

        total = query.count()
        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()

        return [self._to_response(i) for i in items], total

    def get_item(self, item_id: str, user: UserContext) -> ItemResponse:
        item = self.db.query(InventoryItem).filter(
            InventoryItem.id == item_id,
            InventoryItem.user_id == user.id,
            InventoryItem.deleted_at.is_(None)
        ).first()

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item with id '{item_id}' not found."
            )
        return self._to_response(item)

    def update_item(self, item_id: str, data: ItemUpdate, user: UserContext) -> ItemResponse:
        item = self.db.query(InventoryItem).filter(
            InventoryItem.id == item_id,
            InventoryItem.user_id == user.id,
            InventoryItem.deleted_at.is_(None)
        ).first()

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item with id '{item_id}' not found."
            )

        update_dict = data.model_dump(exclude_unset=True)
        if "name" in update_dict and update_dict["name"]:
            item.name = update_dict["name"].strip()
        if "quantity" in update_dict and update_dict["quantity"] is not None:
            item.quantity = update_dict["quantity"]
        if "unit" in update_dict and update_dict["unit"]:
            item.unit = update_dict["unit"]
        if "category" in update_dict and update_dict["category"]:
            cat_name = update_dict["category"].lower()
            item.category_name = cat_name
            cat_rec = self.db.query(FoodCategory).filter(FoodCategory.name == cat_name).first()
            item.category_id = cat_rec.id if cat_rec else None
        if "purchase_date" in update_dict and update_dict["purchase_date"]:
            item.purchase_date = update_dict["purchase_date"]
        if "expiry_date" in update_dict and update_dict["expiry_date"]:
            edt = update_dict["expiry_date"]
            if edt.tzinfo is None:
                edt = edt.replace(tzinfo=timezone.utc)
            item.expiry_date = edt
            item.expiry_source = ExpirySource.USER_PROVIDED.value
        if "storage_location" in update_dict and update_dict["storage_location"]:
            item.storage_location = update_dict["storage_location"]
        if "notes" in update_dict:
            item.notes = update_dict["notes"]
        if "weight_kg" in update_dict:
            item.weight_kg = update_dict["weight_kg"]

        item.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(item)
        return self._to_response(item)

    def delete_item(self, item_id: str, user: UserContext) -> None:
        item = self.db.query(InventoryItem).filter(
            InventoryItem.id == item_id,
            InventoryItem.user_id == user.id,
            InventoryItem.deleted_at.is_(None)
        ).first()

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item with id '{item_id}' not found."
            )

        # Soft delete
        item.deleted_at = datetime.now(timezone.utc)
        self.db.commit()

    def update_item_status(self, item_id: str, action: ItemStatus, user: UserContext) -> ItemResponse:
        item = self.db.query(InventoryItem).filter(
            InventoryItem.id == item_id,
            InventoryItem.user_id == user.id,
            InventoryItem.deleted_at.is_(None)
        ).first()

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item with id '{item_id}' not found."
            )

        action_val = action.value.upper()
        if action_val not in (ItemStatus.USED.value, ItemStatus.DONATED.value, ItemStatus.COMPOSTED.value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported status action '{action.value}'. Must be used, donated, or composted."
            )

        item.status = action_val
        item.used_at = datetime.now(timezone.utc)
        item.updated_at = datetime.now(timezone.utc)

        # Create usage/waste event record for analytics
        event = InventoryEvent(
            user_id=user.id,
            inventory_item_id=item.id,
            event_type=action_val,
            quantity=item.quantity
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(item)

        return self._to_response(item)
