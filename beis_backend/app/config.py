"""
BEIS v3.0 Configuration
========================
MongoDB Atlas (cloud) + local Redis + NVIDIA NIM API.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # MongoDB Atlas
    MONGODB_URI: str = "mongodb+srv://localhost"
    DB_NAME: str = "beis_db"

    # Redis (local Docker)
    REDIS_URL: str = "redis://localhost:6379/0"

    # NVIDIA NIM API
    NVIDIA_API_URL: str = "https://integrate.api.nvidia.com/v1"
    NVIDIA_API_KEY: str = ""
    NVIDIA_MODEL: str = "qwen/qwen3.5-122b-a10b"
    NVIDIA_TIMEOUT: int = 60
    NVIDIA_RETRIES: int = 2

    # JWT
    JWT_SECRET: str = "change-this-to-a-random-64-char-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 15
    REFRESH_EXPIRY_DAYS: int = 30

    # Analysis
    ANALYSIS_WINDOW_DAYS: int = 90
    MIN_TRANSACTIONS: int = 5
    ANOMALY_MIN_TRANSACTIONS: int = 10

    # CORS -- "*" for development (physical device sends origin from PC's LAN IP)
    # For production: set to your actual domain
    CORS_ORIGINS: str = "*"

    @property
    def cors_origin_list(self) -> List[str]:
        origins = self.CORS_ORIGINS.strip()
        if origins == "*":
            return ["*"]
        return [o.strip() for o in origins.split(",") if o.strip()]

    # Cache TTLs (seconds)
    CACHE_TTL_INTELLIGENCE: int = 1800
    CACHE_TTL_INSIGHTS: int = 900
    CACHE_TTL_ANOMALIES: int = 600
    CACHE_TTL_BEHAVIOR: int = 900
    CACHE_TTL_RISK: int = 600
    CACHE_TTL_MOMENTUM: int = 600
    CACHE_TTL_IDENTITY: int = 1800
    CACHE_TTL_THRESHOLDS: int = 1800
    CACHE_TTL_REPORT: int = 3600

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
