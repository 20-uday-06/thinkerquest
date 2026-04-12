from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.profile import UserProfileResponse, UserProfileUpsertRequest
from app.services.profile_service import get_or_create_profile, upsert_profile

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=UserProfileResponse)
def get_profile(db: Session = Depends(get_db_session)) -> UserProfileResponse:
    profile = get_or_create_profile(db)
    return UserProfileResponse.model_validate(profile)


@router.put("", response_model=UserProfileResponse)
def put_profile(
    payload: UserProfileUpsertRequest, db: Session = Depends(get_db_session)
) -> UserProfileResponse:
    profile = upsert_profile(db, payload)
    return UserProfileResponse.model_validate(profile)
