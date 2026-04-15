from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.db.models import UserProfile
from app.schemas.profile import UserProfileUpsertRequest, OnboardingDetailsRequest


def get_profile_by_phone(db: Session, phone_number: str) -> Optional[UserProfile]:
    """Get user profile by phone number. Returns None if not found."""
    return db.query(UserProfile).filter(
        UserProfile.phone_number == phone_number.strip()
    ).first()


def create_profile_for_new_user(db: Session, phone_number: str) -> UserProfile:
    """Create a new profile for a new user (incomplete onboarding)."""
    profile = UserProfile(
        phone_number=phone_number.strip(),
        location="",
        land_size_acre=1.0,
        crop_preference="",
        has_completed_onboarding=False,
        preferred_language="hi",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def get_or_create_profile_by_phone(db: Session, phone_number: str) -> Tuple[UserProfile, bool]:
    """Get profile by phone or create new one. Returns (profile, is_new_user)."""
    profile = get_profile_by_phone(db, phone_number)
    if profile:
        return profile, False
    return create_profile_for_new_user(db, phone_number), True


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


def upsert_profile(db: Session, payload: UserProfileUpsertRequest, phone_number: str) -> UserProfile:
    """Update or create profile by phone number."""
    profile = get_profile_by_phone(db, phone_number)
    if profile is None:
        profile = UserProfile(
            name=payload.name,
            phone_number=phone_number.strip(),
            location=payload.location,
            land_size_acre=payload.land_size_acre,
            crop_preference=payload.crop_preference,
            role=payload.role,
            has_completed_onboarding=payload.has_completed_onboarding or False,
            preferred_language="hi",
        )
        db.add(profile)
    else:
        if payload.name:
            profile.name = payload.name
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


def save_onboarding_details(db: Session, payload: OnboardingDetailsRequest, phone_number: str) -> UserProfile:
    """
    Save user onboarding details based on role.

    - Farmer (किसान): location, crop, land_size, name, phone_number
    - Student (छात्र): location, field, interest, name, phone_number
    - Worker (मजदूर): location, skill, name, phone_number
    """
    profile = get_profile_by_phone(db, phone_number)

    if profile is None:
        # Create new profile with onboarding data
        if payload.role == "किसान":  # Farmer
            profile = UserProfile(
                name=payload.name,
                phone_number=phone_number.strip(),
                role=payload.role,
                location=payload.location,
                crop_preference=payload.crop or "अन्य",
                land_size_acre=payload.land_size or 1.0,
                farm_type=payload.crop,
                has_completed_onboarding=True,
                preferred_language="hi",
            )
        elif payload.role == "छात्र":  # Student
            profile = UserProfile(
                name=payload.name,
                phone_number=phone_number.strip(),
                role=payload.role,
                location=payload.location,
                field_of_study=payload.field,
                interest_area=payload.interest,
                crop_preference="सामान्य",
                land_size_acre=1.0,
                has_completed_onboarding=True,
                preferred_language="hi",
            )
        elif payload.role == "मजदूर":  # Worker
            profile = UserProfile(
                name=payload.name,
                phone_number=phone_number.strip(),
                role=payload.role,
                location=payload.location,
                skill=payload.skill,
                worker_location=payload.location,
                crop_preference="सामान्य",
                land_size_acre=1.0,
                has_completed_onboarding=True,
                preferred_language="hi",
            )
        else:
            raise ValueError(f"Invalid role: {payload.role}")

        db.add(profile)
    else:
        # Update existing profile
        profile.name = payload.name
        profile.role = payload.role
        profile.location = payload.location
        profile.has_completed_onboarding = True

        if payload.role == "किसान":  # Farmer
            profile.farm_type = payload.crop
            profile.crop_preference = payload.crop or "अन्य"
            profile.land_size_acre = payload.land_size or profile.land_size_acre
            profile.field_of_study = None
            profile.interest_area = None
            profile.skill = None
            profile.worker_location = None
        elif payload.role == "छात्र":  # Student
            profile.farm_type = None
            profile.field_of_study = payload.field
            profile.interest_area = payload.interest
            profile.skill = None
            profile.worker_location = None
            profile.crop_preference = "सामान्य"
            if profile.land_size_acre <= 0:
                profile.land_size_acre = 1.0
        elif payload.role == "मजदूर":  # Worker
            profile.farm_type = None
            profile.field_of_study = None
            profile.interest_area = None
            profile.skill = payload.skill
            profile.worker_location = payload.location
            profile.crop_preference = "सामान्य"
            if profile.land_size_acre <= 0:
                profile.land_size_acre = 1.0

    db.commit()
    db.refresh(profile)
    return profile
