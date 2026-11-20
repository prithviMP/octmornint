from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")

    app_name: str = "PrepPulse API"
    database_url: str = "sqlite:///./data/app.db"
    seed_on_boot: bool = True
    cors_origins: str = "http://localhost:3000"
    groq_api_key: str | None = None
    groq_model: str = "openai/gpt-oss-20b"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
