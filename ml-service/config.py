"""
Configuration settings for ML Service
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        protected_namespaces=('settings_',)  # Avoid conflict with model_ prefix
    )
    
    # Database Configuration
    database_url: str
    
    # Supabase Configuration
    supabase_url: str
    supabase_service_key: str
    
    # ML Service Configuration
    model_path: str = "./models"
    model_version: str = "1.0.0"
    prediction_batch_size: int = 100
    training_enabled: bool = True
    
    # Redis Cache (optional)
    redis_url: Optional[str] = None
    
    # Monitoring
    log_level: str = "INFO"
    sentry_dsn: Optional[str] = None


# Global settings instance
settings = Settings()
