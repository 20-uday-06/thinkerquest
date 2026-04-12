from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class UserProfileUpsertRequest(BaseModel):
    location: str = Field(min_length=2, max_length=120)
    land_size_acre: float = Field(gt=0, le=500)
    crop_preference: str = Field(min_length=2, max_length=80)

    @field_validator("location", "crop_preference")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        return value.strip()


class UserProfileResponse(BaseModel):
    id: int
    location: str
    land_size_acre: float
    crop_preference: str
    updated_at: datetime

    model_config = {"from_attributes": True}
