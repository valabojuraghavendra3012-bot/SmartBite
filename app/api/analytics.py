"""Analytics dashboard endpoints for tracking pantry inventory and waste prevention impact."""
from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db, InventoryItem, InventoryEvent
from app.models.schemas import DashboardAnalyticsResponse, MonthlyWasteTrend, ItemStatus, UserContext
from app.api.auth import get_current_user
from app.utils.freshness import calculate_freshness

router = APIRouter(prefix="/analytics", tags=["Analytics & Impact"])


def compute_dashboard_analytics(user: UserContext, db: Session) -> DashboardAnalyticsResponse:
    now_utc = datetime.now(timezone.utc)
    
    # Active items
    active_items = db.query(InventoryItem).filter(
        InventoryItem.user_id == user.id,
        InventoryItem.status == ItemStatus.ACTIVE.value,
        InventoryItem.deleted_at.is_(None)
    ).all()

    total_items = len(active_items)
    fresh_items = 0
    expiring_items = 0
    expired_items = 0

    for item in active_items:
        st, hours, _ = calculate_freshness(item.expiry_date, reference_time=now_utc)
        if st.value == "FRESH":
            fresh_items += 1
        elif st.value == "EXPIRING_SOON":
            expiring_items += 1
        elif st.value == "EXPIRED":
            expired_items += 1

    # Events breakdown
    events = db.query(InventoryEvent).filter(
        InventoryEvent.user_id == user.id
    ).all()

    used_items = sum(1 for e in events if e.event_type.upper() == "USED")
    donated_items = sum(1 for e in events if e.event_type.upper() == "DONATED")
    composted_items = sum(1 for e in events if e.event_type.upper() == "COMPOSTED")

    # Estimated waste prevented: items used or donated that avoided landfill
    # Approximate ~0.35kg per typical food item if weight not explicitly logged
    prevented_kg = round(float((used_items + donated_items) * 0.35), 2) if (used_items + donated_items) > 0 else 0.0

    # 6-month trend computation
    monthly_trend: List[MonthlyWasteTrend] = []
    for i in range(5, -1, -1):
        # Month start
        year = now_utc.year
        month = now_utc.month - i
        while month <= 0:
            month += 12
            year -= 1
        month_label = datetime(year, month, 1).strftime("%b")
        
        month_events = [
            e for e in events
            if e.created_at.year == year and e.created_at.month == month
        ]
        
        monthly_trend.append(MonthlyWasteTrend(
            month=month_label,
            used=sum(1 for e in month_events if e.event_type.upper() == "USED"),
            donated=sum(1 for e in month_events if e.event_type.upper() == "DONATED"),
            composted=sum(1 for e in month_events if e.event_type.upper() == "COMPOSTED"),
            expired=sum(1 for e in month_events if e.event_type.upper() == "EXPIRED"),
            estimated_kg=round(float(sum(1 for e in month_events if e.event_type.upper() in ("USED", "DONATED")) * 0.35), 1)
        ))

    return DashboardAnalyticsResponse(
        total_items=total_items,
        fresh_items=fresh_items,
        expiring_items=expiring_items,
        expired_items=expired_items,
        used_items=used_items,
        donated_items=donated_items,
        composted_items=composted_items,
        estimated_waste_prevented_kg=prevented_kg,
        monthly_waste_trend=monthly_trend
    )


@router.get("/dashboard", response_model=DashboardAnalyticsResponse, summary="Get kitchen analytics dashboard stats")
def get_analytics_dashboard(
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return compute_dashboard_analytics(current_user, db)


@router.get("", response_model=DashboardAnalyticsResponse, summary="Get analytics overview")
def get_analytics(
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return compute_dashboard_analytics(current_user, db)
