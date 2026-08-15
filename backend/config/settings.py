import os
import secrets
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(*args, **kwargs):
        pass

try:
    from pydantic import BaseModel
except ImportError:
    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)


def _get_or_create_auth_secret(env_secret: str | None) -> str:
    """Returns the configured AUTH_SECRET or generates a secure persistent random key."""
    if env_secret and env_secret != 'change-me':
        return env_secret
    
    # Check if a persistent local keyfile exists in the app root
    key_file = Path(__file__).resolve().parents[1] / '.auth_secret'
    try:
        if key_file.exists():
            content = key_file.read_text(encoding="utf-8").strip()
            if content:
                return content
        new_secret = secrets.token_urlsafe(48)
        key_file.write_text(new_secret, encoding="utf-8")
        return new_secret
    except Exception:
        return secrets.token_urlsafe(48)


class Settings(BaseModel):
    app_name: str = 'Voila Voice-of-Customer Platform'
    debug: bool = False

    # PostgreSQL Database Credentials (Loaded securely via environment)
    database_url: str = ''
    postgres_host: str = 'localhost'
    postgres_port: int = 5432
    postgres_db: str = 'voila'
    postgres_user: str = 'postgres'
    postgres_password: str = ''

    # Vector Database
    vector_db_type: str = 'qdrant'
    vector_db_url: str | None = None
    vector_db_api_key: str | None = None

    # AWS S3 Cloud Storage
    aws_s3_bucket: str = ''
    aws_region: str | None = 'us-east-1'
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_bearer_token_bedrock: str | None = None

    # Snowflake Data Warehouse
    snowflake_account: str = ''
    snowflake_user: str = ''
    snowflake_password: str = ''
    snowflake_role: str | None = None
    snowflake_warehouse: str | None = None
    snowflake_database: str | None = None
    snowflake_schema: str | None = None

    # Persistence Flags
    persist_processed_to_snowflake: bool = False
    persist_kpi_to_snowflake: bool = False

    # Agentic Service & Reasoning LLM
    agentic_bedrock_model_id: str = 'google.gemma-3-27b-it'
    agentic_use_bedrock_mock: bool = True
    agentic_demo_mode: bool = False
    agentic_min_nlp_confidence: float = 0.6
    agentic_min_sample_size: int = 1

    # JWT Authentication Key
    auth_secret: str = ''

    @classmethod
    def from_env(cls) -> 'Settings':
        env_path = Path(__file__).resolve().parents[1] / '.env'
        if env_path.exists():
            load_dotenv(env_path)

        pg_host = _env_str('POSTGRES_HOST', 'localhost')
        pg_port = int(_env_str('POSTGRES_PORT', '5432'))
        pg_user = _env_str('POSTGRES_USER', 'postgres')
        pg_pass = _env_str('POSTGRES_PASSWORD', 'postgres')
        pg_db = _env_str('POSTGRES_DB', 'voila')

        raw_db_url = _env_optional('DATABASE_URL')
        if not raw_db_url:
            raw_db_url = f"postgresql://{pg_user}:{pg_pass}@{pg_host}:{pg_port}/{pg_db}"

        raw_auth_secret = _env_optional('AUTH_SECRET')
        final_auth_secret = _get_or_create_auth_secret(raw_auth_secret)

        return cls(
            app_name=_env_str('APP_NAME', 'Voila Voice-of-Customer Platform'),
            debug=_env_bool('DEBUG', False),
            database_url=raw_db_url,
            postgres_host=pg_host,
            postgres_port=pg_port,
            postgres_user=pg_user,
            postgres_password=pg_pass,
            postgres_db=pg_db,
            vector_db_type=_env_str('VECTOR_DB_TYPE', 'qdrant'),
            vector_db_url=_env_optional('VECTOR_DB_URL'),
            vector_db_api_key=_env_optional('VECTOR_DB_API_KEY'),
            aws_s3_bucket=_env_str('AWS_S3_BUCKET', ''),
            aws_region=_env_str('AWS_REGION', 'us-east-1'),
            aws_access_key_id=_env_optional('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=_env_optional('AWS_SECRET_ACCESS_KEY'),
            aws_bearer_token_bedrock=_env_optional('AWS_BEARER_TOKEN_BEDROCK'),
            snowflake_account=_env_str('SNOWFLAKE_ACCOUNT', ''),
            snowflake_user=_env_str('SNOWFLAKE_USER', ''),
            snowflake_password=_env_str('SNOWFLAKE_PASSWORD', ''),
            snowflake_role=_env_optional('SNOWFLAKE_ROLE'),
            snowflake_warehouse=_env_optional('SNOWFLAKE_WAREHOUSE'),
            snowflake_database=_env_optional('SNOWFLAKE_DATABASE'),
            snowflake_schema=_env_optional('SNOWFLAKE_SCHEMA'),
            persist_processed_to_snowflake=_env_bool('PERSIST_PROCESSED_TO_SNOWFLAKE', False),
            persist_kpi_to_snowflake=_env_bool('PERSIST_KPI_TO_SNOWFLAKE', False),
            agentic_bedrock_model_id=_env_str('AGENTIC_BEDROCK_MODEL_ID', 'google.gemma-3-27b-it'),
            agentic_use_bedrock_mock=_env_bool('AGENTIC_USE_BEDROCK_MOCK', True),
            agentic_demo_mode=_env_bool('AGENTIC_DEMO_MODE', False),
            agentic_min_nlp_confidence=float(_env_str('AGENTIC_MIN_NLP_CONFIDENCE', '0.6')),
            agentic_min_sample_size=int(_env_str('AGENTIC_MIN_SAMPLE_SIZE', '1')),
            auth_secret=final_auth_secret,
        )


def _env_optional(name: str) -> str | None:
    value = os.getenv(name)
    if value is None or value.strip() == '':
        return None
    return value.strip()


def _env_str(name: str, default: str) -> str:
    value = os.getenv(name)
    if value is None or value.strip() == '':
        return default
    return value.strip()


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


settings = Settings.from_env()
