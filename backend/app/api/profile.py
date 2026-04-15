from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.profile import UserProfileResponse, UserProfileUpsertRequest
from app.services.profile_service import get_or_create_profile, upsert_profile, get_profile_by_phone

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=UserProfileResponse)
def get_profile(phone_number: str = Query(...), db: Session = Depends(get_db_session)) -> UserProfileResponse:
    profile = get_profile_by_phone(db, phone_number)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfileResponse.model_validate(profile)


@router.put("", response_model=UserProfileResponse)
def put_profile(
    phone_number: str = Query(...),
    payload: UserProfileUpsertRequest = Depends(),
    db: Session = Depends(get_db_session)
) -> UserProfileResponse:
    profile = upsert_profile(db, payload, phone_number)
    return UserProfileResponse.model_validate(profile)
