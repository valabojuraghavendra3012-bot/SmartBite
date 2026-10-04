"""Parser service for quick text, voice transcripts, and natural item entry."""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.database import ParsingLog
from app.models.schemas import ParsedItem, UserContext
from app.utils.date_parser import parse_natural_item_text


class ParserService:
    def __init__(self, db: Optional[Session] = None):
        self.db = db

    def parse_text(self, text: str, user: Optional[UserContext] = None, input_type: str = "TEXT") -> List[ParsedItem]:
        items = parse_natural_item_text(text)
        
        # Log to parsing_logs if DB session is present
        if self.db:
            try:
                avg_conf = sum(i.confidence for i in items) / len(items) if items else 0.5
                log = ParsingLog(
                    user_id=user.id if user else None,
                    input_type=input_type,
                    raw_input=text,
                    parsed_result=[i.model_dump() for i in items],
                    confidence=round(avg_conf, 2)
                )
                self.db.add(log)
                self.db.commit()
            except Exception:
                self.db.rollback()

        return items
