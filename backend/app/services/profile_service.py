from sqlalchemy.orm import Session

from app.db.models import UserProfile
from app.schemas.profile import UserProfileUpsertRequest, OnboardingDetailsRequest


def get_or_create_profile(db: Session) -> UserProfile:
    profile = db.query(UserProfile).order_by(UserProfile.id.asc()).first()
    if profile:
        return profile

    profile = UserProfile(
        location="देहरादून, उत्तराखंड",
        land_size_acre=1.5,
        crop_preference="गेहूं",
        has_completed_onboarding=False,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def upsert_profile(db: Session, payload: UserProfileUpsertRequest) -> UserProfile:
    profile = db.query(UserProfile).order_by(UserProfile.id.asc()).first()
    if profile is None:
        profile = UserProfile(
            name=payload.name,
            phone_number=payload.phone_number,
            location=payload.location,
            land_size_acre=payload.land_size_acre,
            crop_preference=payload.crop_preference,
            role=payload.role,
            has_completed_onboarding=payload.has_completed_onboarding or False,
        )
        db.add(profile)
    else:
        if payload.name:
            profile.name = payload.name
        if payload.phone_number:
            profile.phone_number = payload.phone_number
        profile.location = payload.location
        profile.land_size_acre = payload.land_size_acre
        profile.crop_preference = payload.crop_preference
        if payload.role:
            profile.role = payload.role
        if payload.has_completed_onboarding is not None:
            profile.has_completed_onboarding = payload.has_completed_onboarding

    db.commit()
    db.refresh(profile)
    return profile


def save_onboarding_details(db: Session, payload: OnboardingDetailsRequest) -> UserProfile:
    """
    Save user onboarding details based on role.

    - Farmer (किसान): location, crop, land_size, name, phone_number
    - Student (छात्र): location, field, interest, name, phone_number
    - Worker (मजदूर): location, skill, name, phone_number
    """
    profile = db.query(UserProfile).order_by(UserProfile.id.asc()).first()

    if profile is None:
        # Create new profile with onboarding data
        if payload.role == "किसान":  # Farmer
            profile = UserProfile(
                name=payload.name,
                phone_number=payload.phone_number,
                role=payload.role,
                location=payload.location,
                crop_preference=payload.crop or "अन्य",
                land_size_acre=payload.land_size or 1.0,
                farm_type=payload.crop,
                has_completed_onboarding=True,
            )
        elif payload.role == "छात्र":  # Student
            profile = UserProfile(
                name=payload.name,
                phone_number=payload.phone_number,
                role=payload.role,
                location=payload.location,
                field_of_study=payload.field,
                interest_area=payload.interest,
                crop_preference="शिक्षा",
                land_size_acre=0.0,
                has_completed_onboarding=True,
            )
        elif payload.role == "मजदूर":  # Worker
            profile = UserProfile(
                name=payload.name,
                phone_number=payload.phone_number,
                role=payload.role,
                location=payload.location,
                skill=payload.skill,
                worker_location=payload.location,
                crop_preference="कौशल",
                land_size_acre=0.0,
                has_completed_onboarding=True,
            )
        else:
            raise ValueError(f"Invalid role: {payload.role}")

        db.add(profile)
    else:
        # Update existing profile
        profile.name = payload.name
        profile.phone_number = payload.phone_number
        profile.role = payload.role
        profile.location = payload.location
        profile.has_completed_onboarding = True

        if payload.role == "किसान":  # Farmer
            profile.farm_type = payload.crop
            profile.crop_preference = payload.crop or "अन्य"
            profile.land_size_acre = payload.land_size or profile.land_size_acre
        elif payload.role == "छात्र":  # Student
            profile.field_of_study = payload.field
            profile.interest_area = payload.interest
            profile.crop_preference = "शिक्षा"
        elif payload.role == "मजदूर":  # Worker
            profile.skill = payload.skill
            profile.worker_location = payload.location
            profile.crop_preference = "कौशल"

    db.commit()
    db.refresh(profile)
    return profile
