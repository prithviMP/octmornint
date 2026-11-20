from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Interview Practice API"
    database_url: str = "sqlite:///./data/app.db"
    seed_on_boot: bool = True
    cors_origins: str = "http://localhost:3000"
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
