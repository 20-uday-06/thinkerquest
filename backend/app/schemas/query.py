from datetime import datetime

from pydantic import BaseModel, Field


class AdvisoryQueryRequest(BaseModel):
    text: str = Field(min_length=2, max_length=500)


class AdvisoryQueryResponse(BaseModel):
    answer: str
    mode: str
    language: str = "hi"
    generated_at: datetime
    sources: list[str] = Field(default_factory=list)
