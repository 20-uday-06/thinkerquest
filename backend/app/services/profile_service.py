from sqlalchemy.orm import Session

from app.db.models import UserProfile
from app.schemas.profile import UserProfileUpsertRequest


def get_or_create_profile(db: Session) -> UserProfile:
    profile = db.query(UserProfile).order_by(UserProfile.id.asc()).first()
    if profile:
        return profile

    profile = UserProfile(
        location="देहरादून, उत्तराखंड",
        land_size_acre=1.5,
        crop_preference="गेहूं",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def upsert_profile(db: Session, payload: UserProfileUpsertRequest) -> UserProfile:
    profile = db.query(UserProfile).order_by(UserProfile.id.asc()).first()
    if profile is None:
        profile = UserProfile(
            location=payload.location,
            land_size_acre=payload.land_size_acre,
            crop_preference=payload.crop_preference,
        )
        db.add(profile)
    else:
        profile.location = payload.location
        profile.land_size_acre = payload.land_size_acre
        profile.crop_preference = payload.crop_preference

    db.commit()
    db.refresh(profile)
    return profile
