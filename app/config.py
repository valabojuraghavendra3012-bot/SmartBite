"""Configuration settings for SmartBite backend."""
from typing import List, Dict
import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application Info
    APP_NAME: str = "SmartBite API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""  # Service role or anon key
    SUPABASE_JWT_SECRET: str = ""

    # Database
    DATABASE_URL: str = ""  # e.g., postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

    # Third-party / AI Services
    GEMINI_API_KEY: str = ""
    WHISPER_API_KEY: str = ""
    OCR_API_KEY: str = ""

    # Security & CORS
    CORS_ORIGINS: List[str] = ["*"]
    ALLOW_CREDENTIALS: bool = True
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB

    # Freshness & Expiry Engine rules
    EXPIRY_WARNING_HOURS: int = 48
    CRITICAL_WARNING_HOURS: int = 24
    CHECKER_INTERVAL_MINUTES: int = 30

    # Demo / Safe Mock Fallback Mode
    DEMO_MODE: bool = True

    # Configurable Shelf-Life Table (Days) for ESTIMATED expiry
    DEFAULT_SHELF_LIFE: Dict[str, int] = {
        "milk": 7,
        "cheese": 14,
        "yogurt": 10,
        "butter": 30,
        "eggs": 21,
        "chicken": 3,
        "beef": 4,
        "pork": 4,
        "fish": 2,
        "spinach": 4,
        "lettuce": 5,
        "kale": 6,
        "tomatoes": 7,
        "potatoes": 28,
        "onions": 30,
        "apples": 21,
        "bananas": 5,
        "berries": 4,
        "oranges": 14,
        "bread": 5,
        "pasta": 180,
        "rice": 365,
        "cereal": 90,
        "tofu": 7,
        "canned goods": 365,
        "frozen meals": 90,
        "vegetables": 5,
        "fruits": 6,
        "meat": 3,
        "dairy": 7,
        "bakery": 4,
        "pantry": 60,
        "other": 7,
    }

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
