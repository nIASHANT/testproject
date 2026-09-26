from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "ReleaseForge"
    APP_VERSION: str = "0.1.0"

    DATABASE_URL: str

    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str

    REDIS_PORT: int

    MINIO_ROOT_USER: str
    MINIO_ROOT_PASSWORD: str

    SECRET_KEY: str
    GITHUB_WEBHOOK_SECRET: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    BACKEND_PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file="../.env",
        extra="ignore"
    )


settings = Settings()
