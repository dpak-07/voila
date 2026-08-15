from functools import lru_cache

from pydantic import BaseModel

from backend.config.settings import settings as backend_settings


class Settings(BaseModel):
    bedrock_model_id: str = "google.gemma-3-27b-it"
    aws_region: str = "us-east-1"
    use_bedrock_mock: bool = True
    agentic_demo_mode: bool = False
    min_nlp_confidence: float = 0.6
    min_sample_size: int = 1


@lru_cache
def get_settings() -> Settings:
    return Settings(
        bedrock_model_id=backend_settings.agentic_bedrock_model_id,
        aws_region=backend_settings.aws_region or Settings().aws_region,
        use_bedrock_mock=backend_settings.agentic_use_bedrock_mock,
        agentic_demo_mode=backend_settings.agentic_demo_mode,
        min_nlp_confidence=backend_settings.agentic_min_nlp_confidence,
        min_sample_size=backend_settings.agentic_min_sample_size,
    )

