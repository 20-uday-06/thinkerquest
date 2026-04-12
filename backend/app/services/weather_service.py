from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import WeatherSnapshot

settings = get_settings()

LOCATION_COORDS: dict[str, tuple[float, float]] = {
    "देहरादून": (30.3165, 78.0322),
    "हरिद्वार": (29.9457, 78.1642),
    "उधमसिंह नगर": (28.9759, 79.4020),
    "उत्तराखंड": (30.0668, 79.0193),
}


def _coords_for_location(location: str) -> tuple[float, float]:
    text = location.strip().lower()
    for key, coords in LOCATION_COORDS.items():
        if key in text or key.lower() in text:
            return coords
    return LOCATION_COORDS["उत्तराखंड"]


def _read_cache(db: Session, location: str) -> WeatherSnapshot | None:
    return db.query(WeatherSnapshot).filter(WeatherSnapshot.location == location).first()


def _upsert_cache(
    db: Session,
    location: str,
    temperature_c: float,
    precipitation_mm: float,
    weather_code: int,
    source: str,
) -> WeatherSnapshot:
    snapshot = _read_cache(db, location)
    now = datetime.now(timezone.utc)

    if snapshot is None:
        snapshot = WeatherSnapshot(
            location=location,
            temperature_c=temperature_c,
            precipitation_mm=precipitation_mm,
            weather_code=weather_code,
            source=source,
            updated_at=now,
        )
        db.add(snapshot)
    else:
        snapshot.temperature_c = temperature_c
        snapshot.precipitation_mm = precipitation_mm
        snapshot.weather_code = weather_code
        snapshot.source = source
        snapshot.updated_at = now

    db.commit()
    db.refresh(snapshot)
    return snapshot


def _is_fresh(snapshot: WeatherSnapshot) -> bool:
    age_limit = datetime.now(timezone.utc) - timedelta(minutes=settings.weather_cache_ttl_min)
    snapshot_time = snapshot.updated_at
    if snapshot_time.tzinfo is None:
        snapshot_time = snapshot_time.replace(tzinfo=timezone.utc)
    return snapshot_time >= age_limit


def _fetch_live_weather(location: str) -> dict:
    lat, lon = _coords_for_location(location)
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}&current=temperature_2m,precipitation,weather_code&timezone=auto"
    )

    with httpx.Client(timeout=3.5) as client:
        response = client.get(url)
        response.raise_for_status()
        payload = response.json()

    current = payload.get("current", {})
    return {
        "temperature_c": float(current.get("temperature_2m", 0.0)),
        "precipitation_mm": float(current.get("precipitation", 0.0)),
        "weather_code": int(current.get("weather_code", 0)),
        "source": "live_open_meteo",
    }


def get_weather_context(db: Session, location: str) -> dict:
    if settings.enable_live_weather:
        try:
            live = _fetch_live_weather(location)
            cached = _upsert_cache(db=db, location=location, **live)
            return {
                "temperature_c": cached.temperature_c,
                "precipitation_mm": cached.precipitation_mm,
                "weather_code": cached.weather_code,
                "source": cached.source,
                "fresh": True,
            }
        except Exception:
            pass

    cached = _read_cache(db, location)
    if cached is not None:
        return {
            "temperature_c": cached.temperature_c,
            "precipitation_mm": cached.precipitation_mm,
            "weather_code": cached.weather_code,
            "source": "cached_weather",
            "fresh": _is_fresh(cached),
        }

    return {
        "temperature_c": 22.0,
        "precipitation_mm": 0.0,
        "weather_code": 0,
        "source": "offline_default",
        "fresh": False,
    }
