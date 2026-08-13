from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    app_name: str = "Voila Backend"
    debug: bool = True

    # MongoDB
    mongo_uri: str
    mongo_db: str
    mongo_collection: str = "conversations"

    # Vector database
    vector_db_type: str = "chromadb"
    vector_db_url: str | None = None
    vector_db_api_key: str | None = None

    # AWS S3
    aws_s3_bucket: str | None = None
    aws_region: str = "us-east-1"
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None

    # Snowflake
    snowflake_account: str | None = None
    snowflake_user: str | None = None
    snowflake_password: str | None = None
    snowflake_role: str | None = None
    snowflake_warehouse: str | None = None
    snowflake_database: str | None = None
    snowflake_schema: str | None = None

    # Authentication
    auth_secret: str = "change-me"

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()