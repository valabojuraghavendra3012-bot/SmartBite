"""Recipe generation endpoints prioritizing ingredients near expiry."""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db, Recipe
from app.models.schemas import RecipeResponse, RecipeGenerateRequest, UserContext
from app.api.auth import get_current_user
from app.services.recipe_service import RecipeService

router = APIRouter(prefix="/recipes", tags=["Recipes"])


@router.post("/generate", response_model=List[RecipeResponse], summary="Generate zero-waste recipes from expiring ingredients")
async def generate_recipes(
    req: Optional[RecipeGenerateRequest] = None,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Intelligently generates recipes using available pantry items,
    prioritizing items expiring within the next 48 hours to eliminate waste.
    """
    max_recipes = req.max_recipes if req else 3
    service = RecipeService(db)
    return await service.generate_recipes(current_user, max_recipes=max_recipes)


@router.get("", response_model=List[RecipeResponse], summary="Get recipe suggestions")
async def get_recipes(
    include_near_expiry: bool = Query(True),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get recommended recipes tailored to the user's current pantry items.
    """
    service = RecipeService(db)
    return await service.generate_recipes(current_user, max_recipes=3)
