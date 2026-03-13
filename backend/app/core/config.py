from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "Marché en Ligne"
    DEBUG: bool = True
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173"]
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/marche_db"
    SECRET_KEY: str = "changez-cette-cle-en-production-minimum-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    AT_USERNAME: str = "sandbox"
    AT_API_KEY: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
