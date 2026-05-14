# backend/core/config.py
#
# All settings come from the .env file.
# Add DATABASE_URL there — copy it from Supabase: Settings → Database → URI.

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    jwt_secret: str
    resend_api_key: str
    allowed_email_domains: str = "ac.uk,edu"
    database_url: str  # full asyncpg URL, e.g. postgresql+asyncpg://postgres:pass@db.xxx.supabase.co:5432/postgres

    @property
    def allowed_domains_list(self) -> list[str]:
        return [d.strip() for d in self.allowed_email_domains.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
