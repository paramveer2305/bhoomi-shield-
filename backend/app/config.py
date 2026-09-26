import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "BHOOMI-SHIELD AI Risk Intelligence Backend"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "bhoomi-shield-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "bhoomi_shield_db"

    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
