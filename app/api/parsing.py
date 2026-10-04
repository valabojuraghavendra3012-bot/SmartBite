"""Parsing endpoints for natural text, receipt images, and voice audio."""
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.schemas import ParseTextRequest, ParseResponse, UserContext
from app.api.auth import get_current_user
from app.services.parser_service import ParserService
from app.services.ocr_service import OCRService
from app.services.voice_service import VoiceService

router = APIRouter(prefix="/items", tags=["Parsing & Ingestion"])


@router.post("/parse", response_model=ParseResponse, summary="Parse natural language item text")
def parse_text_endpoint(
    req: ParseTextRequest,
    current_user: Optional[UserContext] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Parse free-form natural language text into structured items.
    Examples:
      - '2 milk packets expire Oct 12'
      - 'Eggs 12, expiry Oct 15'
      - 'Spinach expires tomorrow'
    """
    service = ParserService(db)
    items = service.parse_text(req.text, user=current_user, input_type="TEXT")
    return ParseResponse(
        items=items,
        message=f"Parsed {len(items)} item(s) successfully."
    )


@router.post("/receipt", response_model=ParseResponse, summary="Process grocery receipt image or text")
async def parse_receipt_endpoint(
    file: UploadFile = File(...),
    current_user: Optional[UserContext] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Scan receipt image to extract product names, quantities, and dates.
    Applies configurable shelf-life defaults when dates are not printed on receipt.
    Does NOT auto-save; returns parsed items for user review and confirmation.
    """
    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum allowed limit (10MB)."
        )

    file_bytes = await file.read()
    ocr_service = OCRService()
    items = await ocr_service.process_receipt(file_bytes, file.filename or "receipt.jpg")

    # Audit log
    parser_service = ParserService(db)
    for item in items:
        # Save log entry
        parser_service.parse_text(f"{item.name} {item.quantity} {item.expiry_date}", user=current_user, input_type="OCR")

    return ParseResponse(
        items=items,
        message=f"Found {len(items)} item(s) on receipt for confirmation."
    )


@router.post("/voice", response_model=ParseResponse, summary="Process voice recording or transcript")
async def parse_voice_endpoint(
    file: Optional[UploadFile] = File(None),
    transcript: Optional[str] = Form(None),
    body: Optional[Dict[str, Any]] = None,
    current_user: Optional[UserContext] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process speech audio into structured inventory items using speech-to-text and natural date parsing.
    Accepts audio file upload or direct transcript string.
    """
    text_to_parse = transcript
    if not text_to_parse and body:
        text_to_parse = body.get("transcript") or body.get("text")

    if file:
        audio_bytes = await file.read()
        voice_service = VoiceService()
        items = await voice_service.process_audio(audio_bytes, file.filename or "audio.wav")
    elif text_to_parse:
        parser_service = ParserService(db)
        items = parser_service.parse_text(text_to_parse, user=current_user, input_type="VOICE")
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either an audio file or transcript text."
        )

    return ParseResponse(
        items=items,
        message=f"Parsed {len(items)} item(s) from voice input."
    )
