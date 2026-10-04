"""Natural language text and date parsing for quick item entry."""
import re
from datetime import datetime, timedelta, timezone, date
from typing import Optional, Tuple, Dict, Any, List
from app.config import settings
from app.models.schemas import ExpirySource, ParsedItem

# Month lookup
MONTHS = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "september": 9, "sept": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

# Number words
NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "dozen": 12, "half dozen": 6,
}

# Category keyword map
CATEGORY_KEYWORDS = {
    "dairy": ["milk", "cheese", "yogurt", "butter", "cream", "curd", "paneer", "parmesan", "cheddar", "mozzarella", "egg", "eggs"],
    "vegetables": ["spinach", "lettuce", "kale", "tomato", "tomatoes", "onion", "onions", "garlic", "potato", "potatoes", "carrot", "carrots", "broccoli", "pepper", "peppers", "cucumber", "zucchini", "cabbage", "cauliflower", "celery", "salad", "greens"],
    "fruits": ["apple", "apples", "banana", "bananas", "orange", "oranges", "berry", "berries", "strawberry", "lemon", "lime", "grape", "grapes", "mango", "avocado", "watermelon", "blueberry"],
    "meat": ["chicken", "beef", "pork", "fish", "salmon", "turkey", "lamb", "bacon", "sausage", "ham", "steak", "shrimp", "tuna"],
    "bakery": ["bread", "bagel", "bagels", "croissant", "loaf", "tortilla", "bun", "buns", "pita", "muffin", "pastry"],
    "pantry": ["rice", "pasta", "flour", "sugar", "cereal", "oats", "lentils", "beans", "chickpeas", "oil", "sauce", "canned", "peanut butter"],
    "beverages": ["juice", "soda", "coffee", "tea", "kombucha", "beer", "wine"],
    "frozen": ["ice cream", "frozen pizza", "frozen berries", "frozen veggies", "frozen"],
}

# Common units
UNITS = ["packet", "packets", "carton", "cartons", "bottle", "bottles", "box", "boxes", "kg", "g", "liter", "liters", "l", "ml", "lb", "lbs", "oz", "bunch", "bunches", "can", "cans", "bag", "bags", "item", "items", "piece", "pieces"]


def infer_category(item_name: str) -> str:
    """Infer food category based on item name keywords."""
    lower_name = item_name.lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', lower_name):
                return cat
    return "other"


def get_default_shelf_life(item_name: str, category: str) -> int:
    """Determine estimated shelf life in days using configurable table."""
    lower_name = item_name.lower()
    for key, days in settings.DEFAULT_SHELF_LIFE.items():
        if re.search(r'\b' + re.escape(key) + r'\b', lower_name):
            return days
    return settings.DEFAULT_SHELF_LIFE.get(category.lower(), settings.DEFAULT_SHELF_LIFE.get("other", 7))


def parse_date_expression(text: str, reference_date: Optional[date] = None) -> Tuple[Optional[date], float]:
    """
    Parse date expressions from natural language.
    Returns (parsed_date, confidence).
    """
    if reference_date is None:
        reference_date = datetime.now(timezone.utc).date()
    
    clean_text = text.lower().strip()
    
    # "tomorrow"
    if re.search(r'\btomorrow\b', clean_text):
        return reference_date + timedelta(days=1), 0.98

    # "today"
    if re.search(r'\btoday\b', clean_text):
        return reference_date, 0.95

    # "in X days"
    m_days = re.search(r'\bin\s+(\d+)\s+days?\b', clean_text)
    if m_days:
        return reference_date + timedelta(days=int(m_days.group(1))), 0.95

    # "in X weeks"
    m_weeks = re.search(r'\bin\s+(\d+)\s+weeks?\b', clean_text)
    if m_weeks:
        return reference_date + timedelta(weeks=int(m_weeks.group(1))), 0.95

    # "in a week"
    if re.search(r'\bin\s+a\s+week\b', clean_text):
        return reference_date + timedelta(days=7), 0.95

    # ISO Format: YYYY-MM-DD
    m_iso = re.search(r'\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b', clean_text)
    if m_iso:
        year, month, day = int(m_iso.group(1)), int(m_iso.group(2)), int(m_iso.group(3))
        try:
            return date(year, month, day), 0.99
        except ValueError:
            pass

    # Format: MM/DD or MM/DD/YYYY
    m_slash = re.search(r'\b(0?[1-9]|1[0-2])/(0?[1-9]|[12]\d|3[01])(?:/(20\d{2}|\d{2}))?\b', clean_text)
    if m_slash:
        month = int(m_slash.group(1))
        day = int(m_slash.group(2))
        year = int(m_slash.group(3)) if m_slash.group(3) else reference_date.year
        if year < 100:
            year += 2000
        try:
            d = date(year, month, day)
            # If date is in past this year and no year specified, assume next year
            if not m_slash.group(3) and d < reference_date:
                d = date(year + 1, month, day)
            return d, 0.95
        except ValueError:
            pass

    # Month name + Day: e.g. "Oct 12", "October 12th", "Oct 12 2026"
    month_pattern = "|".join(MONTHS.keys())
    m_name = re.search(
        rf'\b({month_pattern})\.?\s+([0-3]?\d)(?:st|nd|rd|th)?(?:\s*,?\s*(20\d{{2}}))?\b',
        clean_text
    )
    if m_name:
        month_name = m_name.group(1)
        month = MONTHS[month_name]
        day = int(m_name.group(2))
        year = int(m_name.group(3)) if m_name.group(3) else reference_date.year
        try:
            d = date(year, month, day)
            if not m_name.group(3) and d < reference_date:
                d = date(year + 1, month, day)
            return d, 0.98
        except ValueError:
            pass

    # Day + Month name: e.g. "12 Oct", "12th October"
    m_day_first = re.search(
        rf'\b([0-3]?\d)(?:st|nd|rd|th)?\s+({month_pattern})\.?(?:\s*,?\s*(20\d{{2}}))?\b',
        clean_text
    )
    if m_day_first:
        day = int(m_day_first.group(1))
        month_name = m_day_first.group(2)
        month = MONTHS[month_name]
        year = int(m_day_first.group(3)) if m_day_first.group(3) else reference_date.year
        try:
            d = date(year, month, day)
            if not m_day_first.group(3) and d < reference_date:
                d = date(year + 1, month, day)
            return d, 0.98
        except ValueError:
            pass

    return None, 0.0


def parse_natural_item_text(text: str) -> List[ParsedItem]:
    """
    Parse free-form or comma/newline separated text into structured items.
    Examples:
      - "2 milk packets expire Oct 12"
      - "Eggs 12, expiry Oct 15"
      - "Spinach expires tomorrow"
      - "Milk - Oct 12"
    """
    # Prevent splitting on comma right before an expiry expression (e.g. "Eggs 12, expiry Oct 15")
    clean_input = re.sub(r',\s*(?=(?:exp|expiry|expires?|best by|best before|use by|bb)\b)', ' ', text, flags=re.IGNORECASE)
    lines = [line.strip() for line in re.split(r'[\r\n;]+|,(?!\s*(?:exp|expiry|expires?))', clean_input) if line.strip()]
    results = []

    for raw_line in lines:
        line = raw_line
        
        # 1. Parse date expression
        parsed_date, date_conf = parse_date_expression(line)
        
        # 2. Extract date substring and strip it from the line
        date_pattern = r'(?:expires?|expiry|exp|best by|best before|bb|use by)?\s*(?:(?:in\s+\d+\s+days?)|tomorrow|today|(?:(?:[a-zA-Z]+|\d{1,2})[-/\s]+[a-zA-Z0-9]+(?:st|nd|rd|th)?(?:\s*,?\s*\d{2,4})?))'
        
        # 3. Extract quantity and unit
        quantity = 1.0
        unit = "item"
        
        # Check for word numbers: "two packets of milk"
        for word, val in NUMBER_WORDS.items():
            pattern = rf'\b{word}\b'
            if re.search(pattern, line, re.IGNORECASE):
                quantity = float(val)
                line = re.sub(pattern, '', line, flags=re.IGNORECASE)
                break
        else:
            # Check numeric quantity: "2 milk packets" or "Eggs 12"
            num_match = re.search(r'\b(\d+(?:\.\d+)?)\s*(?:x\b)?', line)
            if num_match:
                try:
                    val = float(num_match.group(1))
                    # Avoid treating day/year as quantity if date parser used it
                    if not (parsed_date and val in (parsed_date.day, parsed_date.year)):
                        quantity = val
                        line = line[:num_match.start()] + line[num_match.end():]
                except ValueError:
                    pass

        # Check for units
        unit_pattern = r'\b(' + '|'.join(UNITS) + r')\b'
        unit_match = re.search(unit_pattern, line, re.IGNORECASE)
        if unit_match:
            unit = unit_match.group(1).lower()
            line = re.sub(unit_pattern, '', line, flags=re.IGNORECASE)

        # 4. Clean up remaining text to get item name
        # Remove keywords like "expires", "expiry", "exp", "best before", "of", "-", ":"
        clean_name = re.sub(r'\b(expires?|expiry|exp|best before|best by|use by|dated?|of|pack|packets?)\b', '', line, flags=re.IGNORECASE)
        # Remove date references if still present
        month_pattern = "|".join(MONTHS.keys())
        clean_name = re.sub(rf'\b({month_pattern})\b', '', clean_name, flags=re.IGNORECASE)
        clean_name = re.sub(r'[\d/\-:,\.]+', ' ', clean_name).strip()
        clean_name = re.sub(r'\s+', ' ', clean_name).strip()

        # Fallback to sensible name if stripped too much
        if not clean_name:
            clean_name = raw_line.split()[0].capitalize() if raw_line.split() else "Food item"
        else:
            clean_name = clean_name.title()

        # 5. Determine category & shelf-life
        category = infer_category(clean_name)
        
        if parsed_date:
            expiry_str = parsed_date.isoformat()
            expiry_source = ExpirySource.USER_PROVIDED
            confidence = min(0.98, max(0.85, (0.90 + date_conf) / 2))
        else:
            # Configurable shelf-life table fallback
            shelf_life_days = get_default_shelf_life(clean_name, category)
            estimated_date = datetime.now(timezone.utc).date() + timedelta(days=shelf_life_days)
            expiry_str = estimated_date.isoformat()
            expiry_source = ExpirySource.ESTIMATED
            confidence = 0.75  # Clearly lower confidence to indicate estimation

        results.append(ParsedItem(
            name=clean_name,
            quantity=quantity,
            unit=unit,
            expiry_date=expiry_str,
            category=category,
            confidence=round(confidence, 2),
            expiry_source=expiry_source
        ))

    return results
