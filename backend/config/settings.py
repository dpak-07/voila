import os
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


class Settings(BaseModel):
    app_name: str = 'Voila Backend'
    debug: bool = True

    # PostgreSQL Database
    database_url: str = 'postgresql://postgres:postgres@localhost:5432/voila'
    postgres_host: str = 'localhost'
    postgres_port: int = 5432
    postgres_db: str = 'voila'
    postgres_user: str = 'postgres'
    postgres_password: str = 'postgres'

    # Vector database
    vector_db_type: str = 'chromadb'
    vector_db_url: str | None = None
    vector_db_api_key: str | None = None

    # AWS S3
    aws_s3_bucket: str = ''
    aws_region: str | None = 'us-east-1'
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_bearer_token_bedrock: str | None = None

    # Snowflake
    snowflake_account: str = ''
    snowflake_user: str = ''
    snowflake_password: str = ''
    snowflake_role: str | None = None
    snowflake_warehouse: str | None = None
    snowflake_database: str | None = None
    snowflake_schema: str | None = None

    # Agentic service / Bedrock
    agentic_bedrock_model_id: str = 'google.gemma-3-27b-it'
    agentic_use_bedrock_mock: bool = True
    agentic_min_nlp_confidence: float = 0.6
    agentic_min_sample_size: int = 1

    auth_secret: str = 'change-me'

    @classmethod
    def from_env(cls) -> 'Settings':
        env_path = Path(__file__).resolve().parents[1] / '.env'
        load_dotenv(env_path)
        
        # Build DATABASE_URL dynamically if not explicitly specified
        raw_db_url = _env_optional('DATABASE_URL')
        pg_host = _env_str('POSTGRES_HOST', cls().postgres_host)
        pg_port = int(_env_str('POSTGRES_PORT', str(cls().postgres_port)))
        pg_user = _env_str('POSTGRES_USER', cls().postgres_user)
        pg_pass = _env_str('POSTGRES_PASSWORD', cls().postgres_password)
        pg_db = _env_str('POSTGRES_DB', cls().postgres_db)
        
        final_db_url = raw_db_url or f"postgresql://{pg_user}:{pg_pass}@{pg_host}:{pg_port}/{pg_db}"

        return cls(
            app_name=_env_str('APP_NAME', cls().app_name),
            debug=_env_bool('DEBUG', cls().debug),
            database_url=final_db_url,
            postgres_host=pg_host,
            postgres_port=pg_port,
            postgres_user=pg_user,
            postgres_password=pg_pass,
            postgres_db=pg_db,
            vector_db_type=_env_str('VECTOR_DB_TYPE', cls().vector_db_type),
            vector_db_url=_env_optional('VECTOR_DB_URL'),
            vector_db_api_key=_env_optional('VECTOR_DB_API_KEY'),
            aws_s3_bucket=_env_str('AWS_S3_BUCKET', cls().aws_s3_bucket),
            aws_region=_env_str('AWS_REGION', cls().aws_region or 'us-east-1'),
            aws_access_key_id=_env_optional('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=_env_optional('AWS_SECRET_ACCESS_KEY'),
            aws_bearer_token_bedrock=_env_optional('AWS_BEARER_TOKEN_BEDROCK'),
            snowflake_account=_env_str('SNOWFLAKE_ACCOUNT', cls().snowflake_account),
            snowflake_user=_env_str('SNOWFLAKE_USER', cls().snowflake_user),
            snowflake_password=_env_str('SNOWFLAKE_PASSWORD', cls().snowflake_password),
            snowflake_role=_env_optional('SNOWFLAKE_ROLE'),
            snowflake_warehouse=_env_optional('SNOWFLAKE_WAREHOUSE'),
            snowflake_database=_env_optional('SNOWFLAKE_DATABASE'),
            snowflake_schema=_env_optional('SNOWFLAKE_SCHEMA'),
            agentic_bedrock_model_id=_env_str('AGENTIC_BEDROCK_MODEL_ID', cls().agentic_bedrock_model_id),
            agentic_use_bedrock_mock=_env_bool('AGENTIC_USE_BEDROCK_MOCK', cls().agentic_use_bedrock_mock),
            agentic_min_nlp_confidence=float(
                _env_str('AGENTIC_MIN_NLP_CONFIDENCE', str(cls().agentic_min_nlp_confidence))
            ),
            agentic_min_sample_size=int(_env_str('AGENTIC_MIN_SAMPLE_SIZE', str(cls().agentic_min_sample_size))),
            auth_secret=_env_str('AUTH_SECRET', cls().auth_secret),
        )



def _env_optional(name: str) -> str | None:
    value = os.getenv(name)
    if value is None or value == '':
        return None
    return value


def _env_str(name: str, default: str) -> str:
    value = os.getenv(name)
    if value is None:
        return default
    return value


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


settings = Settings.from_env()
