from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class UserProfileUpsertRequest(BaseModel):
    # User identification
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    phone_number: Optional[str] = Field(None, min_length=10, max_length=20)

    # Role and onboarding
    role: Optional[str] = Field(None, min_length=2, max_length=40)
    has_completed_onboarding: Optional[bool] = None

    # Base fields
    location: str = Field(min_length=2, max_length=120)
    land_size_acre: float = Field(gt=0, le=500)
    crop_preference: str = Field(min_length=2, max_length=80)

    # Farmer-specific
    farm_type: Optional[str] = Field(None, min_length=2, max_length=80)

    # Student-specific
    field_of_study: Optional[str] = Field(None, min_length=2, max_length=120)
    interest_area: Optional[str] = Field(None, min_length=2, max_length=120)

    # Worker-specific
    skill: Optional[str] = Field(None, min_length=2, max_length=120)
    worker_location: Optional[str] = Field(None, min_length=2, max_length=120)

    @field_validator("location", "crop_preference", "farm_type", "field_of_study", "interest_area", "skill", "worker_location", "name", "phone_number")
    @classmethod
    def normalize_text(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() if value else None


class UserProfileResponse(BaseModel):
    id: int
    name: Optional[str]
    phone_number: Optional[str]
    role: Optional[str]
    has_completed_onboarding: bool
    location: str
    land_size_acre: float
    crop_preference: str
    farm_type: Optional[str]
    field_of_study: Optional[str]
    interest_area: Optional[str]
    skill: Optional[str]
    worker_location: Optional[str]
    preferred_language: str
    updated_at: datetime

    model_config = {"from_attributes": True}


# New schema for onboarding submission
class OnboardingDetailsRequest(BaseModel):
    """Request schema for onboarding details submission - varies by role"""
    name: str = Field(min_length=2, max_length=120)
    phone_number: str = Field(min_length=10, max_length=20)
    role: str = Field(min_length=2, max_length=40)
    location: str = Field(min_length=2, max_length=120)

    # Farmer fields
    crop: Optional[str] = Field(None, min_length=2, max_length=80)
    land_size: Optional[float] = Field(None, gt=0, le=500)

    # Student fields
    field: Optional[str] = Field(None, min_length=2, max_length=120)
    interest: Optional[str] = Field(None, min_length=2, max_length=120)

    # Worker fields
    skill: Optional[str] = Field(None, min_length=2, max_length=120)

    @field_validator("location", "crop", "field", "interest", "skill", "name", "phone_number")
    @classmethod
    def normalize_text(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() if value else None


# Auth schemas
class LoginRequest(BaseModel):
    """Request schema for login with phone number"""
    phone_number: str = Field(min_length=10, max_length=20)

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        """Validate and normalize phone number - must be 10 digits"""
        cleaned = value.strip().replace(" ", "").replace("-", "")
        if not cleaned.isdigit() or len(cleaned) != 10:
            raise ValueError("Phone number must be exactly 10 digits")
        return cleaned


class LoginResponse(BaseModel):
    """Response schema for login"""
    user_id: int
    profile: UserProfileResponse
    is_new_user: bool


class CheckPhoneResponse(BaseModel):
    """Response schema for phone existence check"""
    exists: bool
    profile: Optional[UserProfileResponse] = None
    is_new_user: bool
