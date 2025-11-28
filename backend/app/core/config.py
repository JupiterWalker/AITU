from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str | None = None
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
