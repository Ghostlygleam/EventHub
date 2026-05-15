# backend/core/config.py

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    jwt_secret: str
    resend_api_key: str
    database_url: str
    allowed_email_domains: str = "ac.uk,edu"
    dev_auth_bypass: bool = False  # set to true in .env for local dev only, never in prod

    @property
    def allowed_domains_list(self) -> list[str]:
        return [d.strip() for d in self.allowed_email_domains.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()