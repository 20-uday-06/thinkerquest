from fastapi import APIRouter, HTTPException, status

from app.schemas.voice import VoiceTTSRequest, VoiceTTSResponse
from app.services.voice_service import synthesize_hindi_tts

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/tts", response_model=VoiceTTSResponse)
def text_to_speech(payload: VoiceTTSRequest) -> VoiceTTSResponse:
    try:
        result = synthesize_hindi_tts(text=payload.text, language=payload.language)
        return VoiceTTSResponse(**result)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"TTS unavailable: {exc}",
        ) from exc
