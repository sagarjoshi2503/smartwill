from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    mongodb_uri: str | None = None

    # Client IDs are not secret, so reusing the same VITE_-prefixed var the
    # frontend uses is fine — it just also needs to be set (without the Vite
    # prefix requirement) in this app's own environment.
    vite_google_client_id: str | None = None
    google_client_id: str | None = None

    @property
    def google_id(self) -> str | None:
        return self.vite_google_client_id or self.google_client_id


@lru_cache
def get_settings() -> Settings:
    return Settings()
