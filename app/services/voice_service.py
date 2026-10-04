"""Voice input and speech-to-text service with provider abstraction."""
from abc import ABC, abstractmethod
from typing import Optional, List
import httpx
from app.config import settings
from app.models.schemas import ParsedItem, ExpirySource
from app.utils.date_parser import parse_natural_item_text


class BaseSpeechToTextProvider(ABC):
    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, filename: str) -> str:
        pass


class WhisperSpeechProvider(BaseSpeechToTextProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key

    async def transcribe(self, audio_bytes: bytes, filename: str) -> str:
        url = "https://api.openai.com/v1/audio/transcriptions"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        files = {"file": (filename, audio_bytes, "audio/mpeg")}
        data = {"model": "whisper-1"}

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, files=files, data=data)
            resp.raise_for_status()
            return resp.json().get("text", "")


class DemoSpeechToTextProvider(BaseSpeechToTextProvider):
    """Fallback speech-to-text provider for local testing and demo environments."""
    async def transcribe(self, audio_bytes: bytes, filename: str) -> str:
        # If audio contains recognizable sample or text representation
        try:
            text = audio_bytes.decode("utf-8")
            if len(text.strip()) > 3:
                return text.strip()
        except Exception:
            pass
        return "Two packets of milk expire October 12, and one bag of spinach expires tomorrow"


class VoiceService:
    def __init__(self, provider: Optional[BaseSpeechToTextProvider] = None):
        if provider:
            self.provider = provider
        elif settings.WHISPER_API_KEY.strip():
            self.provider = WhisperSpeechProvider(settings.WHISPER_API_KEY.strip())
        else:
            self.provider = DemoSpeechToTextProvider()

    async def process_audio(self, audio_bytes: bytes, filename: str) -> List[ParsedItem]:
        transcript = await self.provider.transcribe(audio_bytes, filename)
        items = parse_natural_item_text(transcript)
        for item in items:
            item.expiry_source = ExpirySource.VOICE
        return items
