from sqlalchemy.orm import Session

from app.db.models import UserProfile


def seed_demo_profile(db: Session) -> None:
    """Seed a demo profile if none exists. Handle migration of NULL phone numbers."""
    # Check for any existing profiles
    existing = db.query(UserProfile).first()

    if existing:
        # Migrate existing profiles with NULL phone numbers
        profiles_without_phone = db.query(UserProfile).filter(
            UserProfile.phone_number == None
        ).all()

        for i, profile in enumerate(profiles_without_phone):
            # Generate a demo phone number based on profile ID
            profile.phone_number = f"999999{str(i).zfill(4)}"

        if profiles_without_phone:
            db.commit()
        return

    # Create demo profile with phone number
    profile = UserProfile(
        phone_number="9999999999",  # Demo phone number
        location="देहरादून, उत्तराखंड",
        land_size_acre=2.0,
        crop_preference="गेहूं",
        preferred_language="hi",
    )
    db.add(profile)
    db.commit()
