from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.profile import LoginRequest, LoginResponse, CheckPhoneResponse, UserProfileResponse
from app.services.profile_service import (
    get_profile_by_phone,
    get_or_create_profile_by_phone,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db_session)) -> LoginResponse:
    """
    Login with phone number. Creates a new user if phone doesn't exist.
    """
    profile, is_new = get_or_create_profile_by_phone(db, payload.phone_number)

    return LoginResponse(
        user_id=profile.id,
        profile=UserProfileResponse.model_validate(profile),
        is_new_user=is_new,
    )


@router.get("/check-phone/{phone_number}", response_model=CheckPhoneResponse)
def check_phone_exists(phone_number: str = Path(...), db: Session = Depends(get_db_session)) -> CheckPhoneResponse:
    """
    Check if a phone number exists in the system.
    """
    profile = get_profile_by_phone(db, phone_number)

    return CheckPhoneResponse(
        exists=profile is not None,
        profile=UserProfileResponse.model_validate(profile) if profile else None,
        is_new_user=profile is None,
    )


@router.post("/logout")
def logout() -> dict[str, bool]:
    """
    Logout endpoint (primarily for frontend state management).
    Backend doesn't maintain sessions, so this is mostly symbolic.
    """
    return {"success": True}
