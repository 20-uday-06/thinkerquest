from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = Field(default="development", alias="APP_ENV")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    backend_host: str = Field(default="0.0.0.0", alias="BACKEND_HOST")
    backend_port: int = Field(default=8000, alias="BACKEND_PORT")

    cors_origins_raw: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")

    sqlite_db_path: str = Field(default="data/rural_assistant.db", alias="SQLITE_DB_PATH")

    enable_llm: bool = Field(default=True, alias="ENABLE_LLM")
    enable_cloud_tts: bool = Field(default=True, alias="ENABLE_CLOUD_TTS")
    enable_offline_fallback: bool = Field(default=True, alias="ENABLE_OFFLINE_FALLBACK")
    enable_live_weather: bool = Field(default=True, alias="ENABLE_LIVE_WEATHER")
    weather_cache_ttl_min: int = Field(default=90, alias="WEATHER_CACHE_TTL_MIN")
    rate_limit_window_sec: int = Field(default=60, alias="RATE_LIMIT_WINDOW_SEC")
    rate_limit_max_requests: int = Field(default=30, alias="RATE_LIMIT_MAX_REQUESTS")

    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    hf_api_token: str | None = Field(default=None, alias="HF_API_TOKEN")
    google_tts_api_key: str | None = Field(default=None, alias="GOOGLE_TTS_API_KEY")

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
