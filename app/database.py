"""Database configuration and SQLAlchemy ORM models."""
import uuid
from datetime import datetime, timezone, date
from typing import Generator
from sqlalchemy import (
    create_engine, Column, String, Integer, Float, Boolean,
    DateTime, Date, ForeignKey, Text, JSON, UniqueConstraint
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session
from app.config import settings

# Determine database URL. Fallback to local SQLite if PostgreSQL URL is not configured
db_url = settings.DATABASE_URL.strip()
if not db_url:
    db_url = "sqlite:///./smartbite.db"
elif db_url.startswith("postgres://"):
    # SQLAlchemy requires postgresql:// instead of postgres://
    db_url = db_url.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if "sqlite" in db_url else {}
engine = create_engine(db_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# -----------------------------------------------------------------------------
# TABLE 1: profiles
# -----------------------------------------------------------------------------
class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String, primary_key=True)  # References Supabase auth.users id
    full_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    inventory_items = relationship("InventoryItem", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    events = relationship("InventoryEvent", back_populates="user", cascade="all, delete-orphan")
    recipes = relationship("Recipe", back_populates="user", cascade="all, delete-orphan")


# -----------------------------------------------------------------------------
# TABLE 2: food_categories
# -----------------------------------------------------------------------------
class FoodCategory(Base):
    __tablename__ = "food_categories"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, nullable=False, index=True)
    icon = Column(String, nullable=True)
    default_shelf_life_days = Column(Integer, default=7, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    items = relationship("InventoryItem", back_populates="category_rel")


# -----------------------------------------------------------------------------
# TABLE 3: inventory_items
# -----------------------------------------------------------------------------
class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    category_id = Column(String, ForeignKey("food_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    category_name = Column(String, default="other")
    quantity = Column(Float, default=1.0, nullable=False)
    unit = Column(String, default="item", nullable=False)
    purchase_date = Column(Date, default=date.today, nullable=False)
    expiry_date = Column(DateTime(timezone=True), nullable=False, index=True)
    expiry_source = Column(String, default="USER_PROVIDED", nullable=False)  # USER_PROVIDED, ESTIMATED, OCR, VOICE, BARCODE
    storage_location = Column(String, default="Fridge", nullable=False)
    notes = Column(Text, nullable=True)
    weight_kg = Column(Float, nullable=True)
    status = Column(String, default="ACTIVE", nullable=False, index=True)  # ACTIVE, USED, DONATED, COMPOSTED
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("Profile", back_populates="inventory_items")
    category_rel = relationship("FoodCategory", back_populates="items")
    notifications = relationship("Notification", back_populates="item", cascade="all, delete-orphan")
    events = relationship("InventoryEvent", back_populates="item", cascade="all, delete-orphan")


# -----------------------------------------------------------------------------
# TABLE 4: notifications
# -----------------------------------------------------------------------------
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    inventory_item_id = Column(String, ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=True, index=True)
    type = Column(String, nullable=False)  # EXPIRY_48H, EXPIRY_24H, EXPIRED, SYSTEM
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    scheduled_for = Column(DateTime(timezone=True), default=utc_now, index=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("inventory_item_id", "type", name="uq_item_notification_type"),
    )

    user = relationship("Profile", back_populates="notifications")
    item = relationship("InventoryItem", back_populates="notifications")


# -----------------------------------------------------------------------------
# TABLE 5: inventory_events
# -----------------------------------------------------------------------------
class InventoryEvent(Base):
    __tablename__ = "inventory_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    inventory_item_id = Column(String, ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String, nullable=False)  # ADDED, USED, DONATED, COMPOSTED, EXPIRED
    quantity = Column(Float, default=1.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    user = relationship("Profile", back_populates="events")
    item = relationship("InventoryItem", back_populates="events")


# -----------------------------------------------------------------------------
# TABLE 6: recipes
# -----------------------------------------------------------------------------
class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    preparation_time_minutes = Column(Integer, default=15)
    difficulty = Column(String, default="Easy")
    instructions = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("Profile", back_populates="recipes")
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")


# -----------------------------------------------------------------------------
# TABLE 7: recipe_ingredients
# -----------------------------------------------------------------------------
class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id = Column(String, primary_key=True, default=generate_uuid)
    recipe_id = Column(String, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    inventory_item_id = Column(String, ForeignKey("inventory_items.id", ondelete="SET NULL"), nullable=True)
    ingredient_name = Column(String, nullable=False)
    quantity = Column(String, nullable=True)
    is_expiring_item = Column(Boolean, default=False)

    recipe = relationship("Recipe", back_populates="ingredients")


# -----------------------------------------------------------------------------
# TABLE 8: parsing_logs
# -----------------------------------------------------------------------------
class ParsingLog(Base):
    __tablename__ = "parsing_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=True)
    input_type = Column(String, nullable=False)  # TEXT, VOICE, OCR, BARCODE
    raw_input = Column(Text, nullable=True)
    parsed_result = Column(JSON, nullable=True)
    confidence = Column(Float, default=0.90)
    created_at = Column(DateTime(timezone=True), default=utc_now)


# -----------------------------------------------------------------------------
# TABLE 9: receipt_uploads
# -----------------------------------------------------------------------------
class ReceiptUpload(Base):
    __tablename__ = "receipt_uploads"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    storage_path = Column(String, nullable=False)
    ocr_status = Column(String, default="UPLOADED")  # UPLOADED, PROCESSING, COMPLETED, FAILED
    ocr_result = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


# -----------------------------------------------------------------------------
# TABLE 10: notification_preferences
# -----------------------------------------------------------------------------
class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), unique=True, nullable=False)
    enable_24h = Column(Boolean, default=True)
    enable_48h = Column(Boolean, default=True)
    enable_email = Column(Boolean, default=True)
    enable_push = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


def get_db() -> Generator[Session, None, None]:
    """Dependency for obtaining a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create tables and seed initial category records if needed."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed categories if none exist
        if db.query(FoodCategory).count() == 0:
            seed_cats = [
                ("dairy", "milk", 7),
                ("vegetables", "carrot", 5),
                ("fruits", "apple", 6),
                ("meat", "beef", 3),
                ("bakery", "croissant", 4),
                ("pantry", "package", 60),
                ("frozen", "snowflake", 90),
                ("beverages", "cup-soda", 14),
                ("other", "utensils", 7),
            ]
            for name, icon, days in seed_cats:
                db.add(FoodCategory(name=name, icon=icon, default_shelf_life_days=days))
            db.commit()
    finally:
        db.close()
