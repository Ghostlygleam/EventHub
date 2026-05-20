# backend/core/config.py

from pydantic_settings import BaseSettings
from pydantic import model_validator


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    jwt_secret: str
    resend_api_key: str
    database_url: str
    allowed_email_domains: str = "ac.uk,edu"
    dev_auth_bypass: bool = False  # set to true in .env for local dev only, never in prod
    cors_origins: str = "http://localhost:3000"
    email_from: str = "EventHub <noreply@yourdomain.com>"
    app_env: str = "development"

    @property
    def allowed_domains_list(self) -> list[str]:
        return [d.strip() for d in self.allowed_email_domains.split(",")]

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @model_validator(mode="after")
    def check_bypass_in_prod(self):
        if self.app_env == "production" and self.dev_auth_bypass:
            raise ValueError("DEV_AUTH_BYPASS must not be enabled in production")
        return self

    class Config:
        env_file = ".env"


settings = Settings()
