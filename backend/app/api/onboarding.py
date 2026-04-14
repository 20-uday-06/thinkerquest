"""
Onboarding API endpoints for user role-based details collection.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.profile import OnboardingDetailsRequest, UserProfileResponse
from app.services.profile_service import save_onboarding_details

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("/complete", response_model=UserProfileResponse)
def complete_onboarding(
    payload: OnboardingDetailsRequest, db: Session = Depends(get_db_session)
) -> UserProfileResponse:
    """
    Complete user onboarding with role-specific details.

    - Farmer: requires location, crop, land_size
    - Student: requires location, field, interest
    - Worker: requires location, skill
    """
    profile = save_onboarding_details(db, payload)
    return UserProfileResponse.model_validate(profile)
