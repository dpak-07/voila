from typing import Any, Literal

from pydantic import BaseModel, Field


ToolName = Literal["analytics", "nlp", "snowflake", "vector_db"]
QueryStatus = Literal["valid", "insufficient_data"]


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1)
    run_id: str | None = None
    company: str | None = None
    product: str | None = None
    region: str | None = None
    time_period: str | None = None
    dataset_fields: list[str] = Field(default_factory=list)
    conversations: list[str] = Field(default_factory=list)


class QueryValidationResult(BaseModel):
    status: QueryStatus
    query_type: str
    metrics_required: list[str] = Field(default_factory=list)
    nlp_capabilities: list[str] = Field(default_factory=list)
    contextual_requirements: list[str] = Field(default_factory=list)
    time_period: str | None = None
    company: str | None = None
    product: str | None = None
    region: str | None = None
    can_answer: bool = True
    reason: str | None = None
    required_data: list[str] = Field(default_factory=list)


class ToolDecision(BaseModel):
    query_type: str
    required_tools: list[ToolName]
    required_actions: dict[str, list[str]] = Field(default_factory=dict)
    rationale: str
    metadata: dict[str, Any] = Field(default_factory=dict)
