from typing import Any, Literal

from pydantic import BaseModel, Field


class ValidationIssue(BaseModel):
    field: str
    reason: str


class AgentResponse(BaseModel):
    status: Literal["success", "insufficient_data", "validation_failed"]
    query_type: str
    required_tools: list[str] = Field(default_factory=list)
    answer: str
    context: dict[str, Any] = Field(default_factory=dict)
    validation_issues: list[ValidationIssue] = Field(default_factory=list)
