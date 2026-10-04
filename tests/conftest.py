"""Pytest configuration and fixtures for testing SmartBite backend."""
import os
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Use isolated in-memory SQLite for testing
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["DEMO_MODE"] = "true"

from app.database import Base, get_db, FoodCategory, Profile
from app.main import app

test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    # Seed categories
    categories = [
        ("dairy", "milk", 7),
        ("vegetables", "carrot", 5),
        ("fruits", "apple", 6),
        ("meat", "beef", 3),
        ("bakery", "croissant", 4),
        ("pantry", "package", 60),
        ("other", "utensils", 7),
    ]
    for name, icon, days in categories:
        db.add(FoodCategory(name=name, icon=icon, default_shelf_life_days=days))
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def user1_headers():
    return {"Authorization": "Bearer test-token-user-alpha"}


@pytest.fixture
def user2_headers():
    return {"Authorization": "Bearer test-token-user-beta"}
