"""Inventory item endpoints with user isolation and dynamic freshness calculations."""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.schemas import (
    ItemCreate, ItemUpdate, ItemStatusUpdate, ItemResponse,
    ItemListResponse, ItemStatus, UserContext
)
from app.api.auth import get_current_user
from app.services.inventory_service import InventoryService
from app.services.expiry_service import ExpiryService

router = APIRouter(prefix="/items", tags=["Inventory Items"])


@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED, summary="Create a new inventory item")
def create_item(
    item_in: ItemCreate,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new kitchen inventory item.
    Freshness status and days remaining are automatically calculated on the server.
    """
    service = InventoryService(db)
    return service.create_item(item_in, current_user)


@router.get("", response_model=Dict[str, Any], summary="Get paginated inventory items")
def get_items(
    search: Optional[str] = Query(None, description="Search item by name"),
    category: Optional[str] = Query(None, description="Filter by category (e.g. dairy, vegetables)"),
    status: Optional[str] = Query(None, description="Filter by freshness: fresh, expiring, expired"),
    sort: str = Query("expiry_date", description="Sort by field: expiry_date, name, created_at"),
    order: str = Query("asc", description="Sort order: asc, desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve inventory items strictly for the authenticated user.
    Supports filtering by search term, category, and dynamic freshness status.
    """
    service = InventoryService(db)
    items, total = service.get_items(
        user=current_user,
        search=search,
        category=category,
        status_filter=status,
        sort_by=sort,
        sort_order=order,
        page=page,
        page_size=page_size
    )
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/expiring", response_model=List[ItemResponse], summary="Get items expiring within 48 hours")
def get_expiring_items(
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve user items expiring within the next 48 hours to prioritize cooking and waste reduction.
    """
    service = ExpiryService(db)
    return service.get_expiring_items(current_user, within_hours=48)


@router.get("/{item_id}", response_model=ItemResponse, summary="Get item details")
def get_item(
    item_id: str,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = InventoryService(db)
    return service.get_item(item_id, current_user)


@router.put("/{item_id}", response_model=ItemResponse, summary="Update an item")
def update_item(
    item_id: str,
    item_in: ItemUpdate,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = InventoryService(db)
    return service.update_item(item_id, item_in, current_user)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an item")
def delete_item(
    item_id: str,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = InventoryService(db)
    service.delete_item(item_id, current_user)


@router.patch("/{item_id}/status", response_model=ItemResponse, summary="Update item status (used, donated, composted)")
def update_item_status(
    item_id: str,
    status_update: ItemStatusUpdate,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark an item as used, donated, or composted.
    Creates an inventory event record for waste analytics.
    """
    service = InventoryService(db)
    return service.update_item_status(item_id, status_update.action, current_user)


@router.post("/{item_id}/action", summary="Action endpoint for frontend compatibility")
def apply_item_action(
    item_id: str,
    payload: Dict[str, Any],
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    action_str = payload.get("action", "used").upper()
    action = ItemStatus(action_str)
    service = InventoryService(db)
    updated = service.update_item_status(item_id, action, current_user)
    return {
        "id": updated.id,
        "item_name": updated.name,
        "action": action.value.lower(),
        "quantity": updated.quantity,
        "unit": updated.unit,
        "created_at": updated.updated_at.isoformat(),
        "estimated_kg": updated.weight_kg
    }
