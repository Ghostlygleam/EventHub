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
    database_url: str
    allowed_email_domains: str = "ac.uk,edu"
    dev_auth_bypass: bool = False  # set to true in .env for local dev only, never in prod

    @property
    def allowed_domains_list(self) -> list[str]:
        return [d.strip() for d in self.allowed_email_domains.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()