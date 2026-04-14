from fastapi import APIRouter

from app.api.health import router as health_router
from app.api.profile import router as profile_router
from app.api.query import router as query_router
from app.api.sync import router as sync_router
from app.api.voice import router as voice_router
from app.api.onboarding import router as onboarding_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(profile_router)
api_router.include_router(query_router)
api_router.include_router(sync_router)
api_router.include_router(voice_router)
api_router.include_router(onboarding_router)
