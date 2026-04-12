from pydantic import BaseModel, Field


class VoiceTTSRequest(BaseModel):
    text: str = Field(min_length=2, max_length=700)
    language: str = Field(default="hi")


class VoiceTTSResponse(BaseModel):
    audio_base64: str
    mime_type: str
    mode: str
