"""Recipe generator service with pluggable LLM provider and safe fallback."""
import json
import logging
from abc import ABC, abstractmethod
from typing import List, Optional
import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.database import InventoryItem
from app.models.schemas import (
    RecipeResponse, RecipeIngredientItem, UserContext, ItemStatus
)

logger = logging.getLogger(__name__)


class BaseRecipeProvider(ABC):
    @abstractmethod
    async def generate_recipes(
        self,
        expiring_items: List[InventoryItem],
        all_items: List[InventoryItem],
        max_recipes: int = 3
    ) -> List[RecipeResponse]:
        pass


class GeminiRecipeProvider(BaseRecipeProvider):
    """Google Gemini LLM provider for zero-waste recipe generation."""

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def generate_recipes(
        self,
        expiring_items: List[InventoryItem],
        all_items: List[InventoryItem],
        max_recipes: int = 3
    ) -> List[RecipeResponse]:
        expiring_names = [f"{i.name} ({i.quantity} {i.unit}, {i.category_name})" for i in expiring_items]
        pantry_names = [f"{i.name} ({i.quantity} {i.unit})" for i in all_items if i not in expiring_items]

        system_prompt = (
            "You are a master zero-waste culinary chef. Create simple, practical home-cooking recipes "
            "prioritizing ingredients that are nearing expiry to prevent food waste. "
            "Minimize additional ingredients, keep steps concise, and specify difficulty and prep time."
        )

        user_prompt = f"""
Expiring ingredients to rescue urgently:
{', '.join(expiring_names) if expiring_names else 'No items expiring soon'}

Other available pantry items:
{', '.join(pantry_names[:10]) if pantry_names else 'Basic pantry staples'}

Please generate {max_recipes} delicious recipe suggestions in valid JSON format matching this schema:
[
  {{
    "name": "Recipe Name",
    "description": "Short appetizing description",
    "time_minutes": 15,
    "difficulty": "Easy",
    "uses_expiring_items": ["Ingredient 1", "Ingredient 2"],
    "ingredients": [
      {{"name": "Ingredient 1", "quantity": "1 cup", "from_inventory": true, "is_expiring": true}},
      {{"name": "Salt & Pepper", "quantity": "to taste", "from_inventory": false, "is_expiring": false}}
    ],
    "instructions": ["Step 1", "Step 2", "Step 3"]
  }}
]
Return ONLY the raw JSON array.
"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}],
            "generationConfig": {"response_mime_type": "application/json"}
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed_list = json.loads(raw_text)

            recipes = []
            for idx, r in enumerate(parsed_list):
                ingredients = [
                    RecipeIngredientItem(
                        name=ing.get("name", "Ingredient"),
                        quantity=ing.get("quantity"),
                        from_inventory=ing.get("from_inventory", False),
                        is_expiring=ing.get("is_expiring", False)
                    )
                    for ing in r.get("ingredients", [])
                ]
                recipes.append(RecipeResponse(
                    id=f"gemini-{idx + 1}",
                    name=r.get("name", "Zero-Waste Dish"),
                    description=r.get("description"),
                    time_minutes=int(r.get("time_minutes", 15)),
                    difficulty=r.get("difficulty", "Easy"),
                    uses_expiring_items=r.get("uses_expiring_items", []),
                    ingredients=ingredients,
                    instructions=r.get("instructions", []),
                    source="gemini"
                ))
            return recipes


class SmartCulinaryRecipeProvider(BaseRecipeProvider):
    """
    Intelligent zero-waste heuristic recipe generator.
    Guarantees reliable, instant responses during hackathon demos or when API keys are absent.
    """

    async def generate_recipes(
        self,
        expiring_items: List[InventoryItem],
        all_items: List[InventoryItem],
        max_recipes: int = 3
    ) -> List[RecipeResponse]:
        items_to_use = expiring_items if expiring_items else all_items
        if not items_to_use:
            # Fallback pantry staples recipe
            return [RecipeResponse(
                id="default-1",
                name="Quick Pantry Sauté",
                description="A flexible stir-fry to make the most of whatever ingredients you have on hand.",
                time_minutes=15,
                difficulty="Easy",
                uses_expiring_items=[],
                ingredients=[
                    RecipeIngredientItem(name="Mixed Vegetables", quantity="2 cups", from_inventory=True, is_expiring=False),
                    RecipeIngredientItem(name="Olive Oil", quantity="1 tbsp", from_inventory=False, is_expiring=False),
                    RecipeIngredientItem(name="Garlic", quantity="2 cloves", from_inventory=False, is_expiring=False)
                ],
                instructions=[
                    "Heat olive oil in a skillet over medium heat.",
                    "Sauté minced garlic until fragrant, about 1 minute.",
                    "Add vegetables and cook for 5-7 minutes until tender-crisp.",
                    "Season with salt and pepper to taste, then serve warm."
                ],
                source="smart-culinary"
            )]

        recipes: List[RecipeResponse] = []
        names = [item.name for item in items_to_use]
        expiring_names = [item.name for item in expiring_items]

        # Template 1: Skillet / Stir Fry
        primary = names[0]
        secondary = names[1] if len(names) > 1 else "Seasoning"
        skillet_ings = [
            RecipeIngredientItem(
                name=item.name,
                quantity=f"{item.quantity} {item.unit}",
                from_inventory=True,
                is_expiring=(item.name in expiring_names)
            )
            for item in items_to_use[:4]
        ]
        skillet_ings.extend([
            RecipeIngredientItem(name="Olive Oil or Butter", quantity="1-2 tbsp", from_inventory=False, is_expiring=False),
            RecipeIngredientItem(name="Salt & Black Pepper", quantity="to taste", from_inventory=False, is_expiring=False)
        ])

        recipes.append(RecipeResponse(
            id="rec-1",
            name=f"Quick {primary} & {secondary} Skillet",
            description=f"A fast 10-minute skillet created specifically to use up {primary} before it spoils.",
            time_minutes=12,
            difficulty="Easy",
            uses_expiring_items=[i.name for i in items_to_use[:2] if i.name in expiring_names],
            ingredients=skillet_ings,
            instructions=[
                f"Rinse and chop {', '.join([i.name for i in items_to_use[:3]])}.",
                "Warm oil or butter in a wide pan over medium-high heat.",
                f"Toss in {primary} and cook for 3-4 minutes until softened.",
                "Stir in remaining ingredients and seasonings, cooking for another 2 minutes.",
                "Plate hot and enjoy immediately!"
            ],
            source="smart-culinary"
        ))

        # Template 2: Soup / Stew / Bowl
        if max_recipes >= 2:
            bowl_ings = [
                RecipeIngredientItem(
                    name=item.name,
                    quantity=f"{item.quantity} {item.unit}",
                    from_inventory=True,
                    is_expiring=(item.name in expiring_names)
                )
                for item in items_to_use[:3]
            ]
            bowl_ings.extend([
                RecipeIngredientItem(name="Vegetable or Chicken Broth", quantity="2 cups", from_inventory=False, is_expiring=False),
                RecipeIngredientItem(name="Herbs & Spices", quantity="to taste", from_inventory=False, is_expiring=False)
            ])
            recipes.append(RecipeResponse(
                id="rec-2",
                name=f"Comforting {primary} Kitchen Bowl",
                description="Simmer your available produce into a hearty, zero-waste meal.",
                time_minutes=20,
                difficulty="Easy",
                uses_expiring_items=[i.name for i in items_to_use[:3] if i.name in expiring_names],
                ingredients=bowl_ings,
                instructions=[
                    "Bring broth to a gentle simmer in a medium pot.",
                    f"Dice {primary} and other fresh ingredients into bite-sized pieces.",
                    "Add denser ingredients first, then tender greens in the last 2 minutes.",
                    "Simmer for 15 minutes, season, and serve with bread or grains."
                ],
                source="smart-culinary"
            ))

        # Template 3: Oven Bake / Toast
        if max_recipes >= 3 and len(items_to_use) >= 2:
            bake_ings = [
                RecipeIngredientItem(
                    name=item.name,
                    quantity=f"{item.quantity} {item.unit}",
                    from_inventory=True,
                    is_expiring=(item.name in expiring_names)
                )
                for item in items_to_use[:2]
            ]
            bake_ings.extend([
                RecipeIngredientItem(name="Bread, Rice, or Grains", quantity="2 portions", from_inventory=False, is_expiring=False),
                RecipeIngredientItem(name="Cheese or Dressing", quantity="optional", from_inventory=False, is_expiring=False)
            ])
            recipes.append(RecipeResponse(
                id="rec-3",
                name=f"Savory {primary} Melt & Grains",
                description="Transform leftovers into a delicious warm meal with pantry grains.",
                time_minutes=15,
                difficulty="Easy",
                uses_expiring_items=[i.name for i in items_to_use[:2] if i.name in expiring_names],
                ingredients=bake_ings,
                instructions=[
                    "Preheat toaster oven or broiler to 375°F (190°C).",
                    f"Lightly sauté {primary} with seasonings.",
                    "Layer onto bread or warm grains, topped with cheese or dressing.",
                    "Bake for 5-7 minutes until golden and bubbling."
                ],
                source="smart-culinary"
            ))

        return recipes[:max_recipes]


class RecipeService:
    def __init__(self, db: Session):
        self.db = db
        # Provider selection: Gemini LLM if API key configured, otherwise Smart Culinary provider
        if settings.GEMINI_API_KEY.strip():
            self.provider: BaseRecipeProvider = GeminiRecipeProvider(settings.GEMINI_API_KEY.strip())
        else:
            self.provider = SmartCulinaryRecipeProvider()

    async def generate_recipes(self, user: UserContext, max_recipes: int = 3) -> List[RecipeResponse]:
        """
        Retrieve user's items, find expiring items (< 48h), send to LLM provider.
        CRITICAL: Never allow the LLM to directly write to the database.
        """
        all_items = self.db.query(InventoryItem).filter(
            InventoryItem.user_id == user.id,
            InventoryItem.status == ItemStatus.ACTIVE.value,
            InventoryItem.deleted_at.is_(None)
        ).order_by(InventoryItem.expiry_date.asc()).all()

        now_utc = InventoryItem.expiry_date.type
        # Items expiring soon (<= 48h)
        from datetime import datetime, timezone, timedelta
        threshold = datetime.now(timezone.utc) + timedelta(hours=48)
        def ensure_utc(dt):
            return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)
        expiring_items = [i for i in all_items if ensure_utc(i.expiry_date) <= threshold]

        try:
            return await self.provider.generate_recipes(expiring_items, all_items, max_recipes)
        except Exception as e:
            logger.warning(f"Primary recipe provider failed: {e}. Falling back to SmartCulinary provider.")
            fallback = SmartCulinaryRecipeProvider()
            return await fallback.generate_recipes(expiring_items, all_items, max_recipes)
