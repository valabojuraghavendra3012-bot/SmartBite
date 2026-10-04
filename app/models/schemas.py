"""Pydantic schemas for request validation and response serialization."""
from datetime import datetime, date
from enum import Enum
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, ConfigDict


class FreshnessStatus(str, Enum):
    FRESH = "FRESH"
    EXPIRING_SOON = "EXPIRING_SOON"
    EXPIRED = "EXPIRED"


class ExpirySource(str, Enum):
    USER_PROVIDED = "USER_PROVIDED"
    ESTIMATED = "ESTIMATED"
    OCR = "OCR"
    VOICE = "VOICE"
    BARCODE = "BARCODE"


class ItemStatus(str, Enum):
    ACTIVE = "ACTIVE"
    USED = "USED"
    DONATED = "DONATED"
    COMPOSTED = "COMPOSTED"


class NotificationType(str, Enum):
    EXPIRY_48H = "EXPIRY_48H"
    EXPIRY_24H = "EXPIRY_24H"
    EXPIRED = "EXPIRED"
    SYSTEM = "SYSTEM"


class RecipeDifficulty(str, Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"


# -----------------------------------------------------------------------------
# User Context
# -----------------------------------------------------------------------------
class UserContext(BaseModel):
    id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "authenticated"


# -----------------------------------------------------------------------------
# Food Category Schemas
# -----------------------------------------------------------------------------
class CategoryResponse(BaseModel):
    id: str
    name: str
    icon: Optional[str] = None
    default_shelf_life_days: int

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# Inventory Item Schemas
# -----------------------------------------------------------------------------
class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, examples=["Whole Milk"])
    quantity: float = Field(default=1.0, gt=0, examples=[1.0])
    unit: str = Field(default="item", examples=["liter", "carton", "item", "kg"])
    category: Optional[str] = Field(default="other", examples=["dairy", "vegetables", "fruits"])
    purchase_date: Optional[date] = Field(default_factory=date.today)
    expiry_date: Optional[datetime] = Field(default=None, description="ISO-8601 expiry timestamp")
    storage_location: Optional[str] = Field(default="Fridge", examples=["Fridge", "Pantry", "Freezer"])
    notes: Optional[str] = Field(default=None, max_length=500)
    weight_kg: Optional[float] = Field(default=None, ge=0)


class ItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    quantity: Optional[float] = Field(default=None, gt=0)
    unit: Optional[str] = None
    category: Optional[str] = None
    purchase_date: Optional[date] = None
    expiry_date: Optional[datetime] = None
    storage_location: Optional[str] = None
    notes: Optional[str] = None
    weight_kg: Optional[float] = None


class ItemStatusUpdate(BaseModel):
    action: ItemStatus = Field(..., description="Action taken on the item: used, donated, composted")


class ItemResponse(BaseModel):
    id: str
    user_id: str
    name: str
    category: str
    quantity: float
    unit: str
    purchase_date: date
    expiry_date: datetime
    expiry_source: ExpirySource
    storage_location: str
    notes: Optional[str] = None
    status: ItemStatus
    created_at: datetime
    updated_at: datetime
    freshness_status: FreshnessStatus
    days_remaining: float
    hours_remaining: float
    weight_kg: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class ItemListResponse(BaseModel):
    items: List[ItemResponse]
    total: int
    page: int
    page_size: int


# -----------------------------------------------------------------------------
# Parsing Schemas (Quick text, Voice, Receipt)
# -----------------------------------------------------------------------------
class ParseTextRequest(BaseModel):
    text: str = Field(..., min_length=1, examples=["2 milk packets expire Oct 12"])


class ParsedItem(BaseModel):
    name: str
    quantity: float = 1.0
    unit: str = "item"
    expiry_date: Optional[str] = Field(default=None, description="ISO Date string YYYY-MM-DD")
    category: str = "other"
    confidence: float = Field(default=0.90, ge=0.0, le=1.0)
    expiry_source: ExpirySource = ExpirySource.USER_PROVIDED


class ParseResponse(BaseModel):
    items: List[ParsedItem]
    message: Optional[str] = None


class VoiceParseRequest(BaseModel):
    transcript: str = Field(..., min_length=1, examples=["Two cartons of eggs expiring in five days"])


# -----------------------------------------------------------------------------
# Notification Schemas
# -----------------------------------------------------------------------------
class NotificationResponse(BaseModel):
    id: str
    user_id: str
    inventory_item_id: Optional[str] = None
    type: NotificationType
    title: str
    message: str
    scheduled_for: datetime
    read_at: Optional[datetime] = None
    read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# Recipe Schemas
# -----------------------------------------------------------------------------
class RecipeIngredientItem(BaseModel):
    name: str
    quantity: Optional[str] = None
    from_inventory: bool = False
    is_expiring: bool = False


class RecipeResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    time_minutes: int = 15
    difficulty: str = "Easy"
    uses_expiring_items: List[str] = []
    ingredients: List[RecipeIngredientItem] = []
    instructions: List[str] = []
    source: str = "ai"

    model_config = ConfigDict(from_attributes=True)


class RecipeGenerateRequest(BaseModel):
    max_recipes: int = Field(default=3, ge=1, le=5)
    target_ingredient_ids: Optional[List[str]] = None


# -----------------------------------------------------------------------------
# Analytics Schemas
# -----------------------------------------------------------------------------
class MonthlyWasteTrend(BaseModel):
    month: str
    used: int
    donated: int
    composted: int
    expired: int
    estimated_kg: Optional[float] = None


class DashboardAnalyticsResponse(BaseModel):
    total_items: int
    fresh_items: int
    expiring_items: int
    expired_items: int
    used_items: int
    donated_items: int
    composted_items: int
    estimated_waste_prevented_kg: Optional[float] = None
    monthly_waste_trend: List[MonthlyWasteTrend] = []
