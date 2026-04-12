from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import QueryRateLimitMiddleware, SecurityHeadersMiddleware
from app.db.init_db import init_database
from app.db.session import SessionLocal
from app.seed.demo_profile import seed_demo_profile
from app.services.kb_integrity import ensure_kb_files_exist

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging(settings.log_level)
    ensure_kb_files_exist()
    init_database()
    db = SessionLocal()
    try:
        seed_demo_profile(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Rural Assistant API",
    version="0.1.0",
    description="Hindi-first rural agriculture assistant backend.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(QueryRateLimitMiddleware)

register_exception_handlers(app)

app.include_router(api_router)
