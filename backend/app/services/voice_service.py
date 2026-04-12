import base64
from io import BytesIO

from gtts import gTTS

from app.core.config import get_settings

settings = get_settings()


def synthesize_hindi_tts(text: str, language: str = "hi") -> dict[str, str]:
    """Generate TTS audio using cloud Hindi voice when enabled."""

    if not settings.enable_cloud_tts:
        raise RuntimeError("Cloud TTS is disabled by configuration")

    output = BytesIO()
    tts = gTTS(text=text, lang=language, slow=False)
    tts.write_to_fp(output)
    audio_bytes = output.getvalue()

    if not audio_bytes:
        raise RuntimeError("No audio generated")

    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
    return {
        "audio_base64": audio_b64,
        "mime_type": "audio/mpeg",
        "mode": "cloud_gtts",
    }
