from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "rural-assistant-backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
