from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    location: Mapped[str] = mapped_column(String(120), nullable=False)
    land_size_acre: Mapped[float] = mapped_column(Float, nullable=False)
    crop_preference: Mapped[str] = mapped_column(String(80), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class ConversationLog(Base):
    __tablename__ = "conversation_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_query: Mapped[str] = mapped_column(Text, nullable=False)
    assistant_response: Mapped[str] = mapped_column(Text, nullable=False)
    mode: Mapped[str] = mapped_column(String(40), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )


class SyncEvent(Base):
    __tablename__ = "sync_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    client_event_id: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(40), nullable=False)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )


class WeatherSnapshot(Base):
    __tablename__ = "weather_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    location: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    temperature_c: Mapped[float] = mapped_column(Float, nullable=False)
    precipitation_mm: Mapped[float] = mapped_column(Float, nullable=False)
    weather_code: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(String(40), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
