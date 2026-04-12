from sqlalchemy.orm import Session

from app.db.models import UserProfile


def seed_demo_profile(db: Session) -> None:
    existing = db.query(UserProfile).order_by(UserProfile.id.asc()).first()
    if existing:
        return

    profile = UserProfile(
        location="देहरादून, उत्तराखंड",
        land_size_acre=2.0,
        crop_preference="गेहूं",
    )
    db.add(profile)
    db.commit()
