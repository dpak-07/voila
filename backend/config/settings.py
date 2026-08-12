from pydantic import BaseSettings


class Settings(BaseSettings):
    app_name: str = 'Voila Backend'
    debug: bool = True

    # MongoDB
    mongo_uri: str
    mongo_db: str
    mongo_collection: str = 'conversations'

    # Vector database
    vector_db_type: str = 'chromadb'
    vector_db_url: str | None = None
    vector_db_api_key: str | None = None

    # AWS S3
    aws_s3_bucket: str
    aws_region: str | None = 'us-east-1'
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None

    # Snowflake
    snowflake_account: str
    snowflake_user: str
    snowflake_password: str
    snowflake_role: str | None = None
    snowflake_warehouse: str | None = None
    snowflake_database: str | None = None
    snowflake_schema: str | None = None

    auth_secret: str = 'change-me'

    class Config:
        env_file = '.env'
        env_file_encoding = 'utf-8'


settings = Settings()
