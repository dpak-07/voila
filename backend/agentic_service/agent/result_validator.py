from typing import Any

from backend.agentic_service.config import get_settings
from backend.agentic_service.schemas.response import ValidationIssue


class ResultValidator:
    def __init__(self, min_nlp_confidence: float | None = None, min_sample_size: int | None = None) -> None:
        settings = get_settings()
        self.min_nlp_confidence = min_nlp_confidence if min_nlp_confidence is not None else settings.min_nlp_confidence
        self.min_sample_size = min_sample_size if min_sample_size is not None else settings.min_sample_size

    def validate(self, results: dict[str, Any], required_tools: list[str]) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []

        for tool in required_tools:
            if tool not in results or not results[tool]:
                issues.append(ValidationIssue(field=tool, reason="Required tool returned no data."))
            else:
                tool_data = results[tool]
                if isinstance(tool_data, dict):
                    if tool_data.get("status") == "no_data_available":
                        issues.append(
                            ValidationIssue(
                                field=tool,
                                reason=tool_data.get("reason", "No data available for this query."),
                                data_status="no_data_available",
                            )
                        )
                    for action, payload in tool_data.items():
                        if isinstance(payload, dict) and payload.get("status") == "no_data_available":
                            issues.append(
                                ValidationIssue(
                                    field=f"{tool}.{action}",
                                    reason=payload.get("reason", f"No data available for {action}."),
                                    data_status="no_data_available",
                                )
                            )

        self._validate_nlp(results.get("nlp", {}), issues)
        self._validate_samples(results, issues)
        self._validate_rag(results.get("vector_db", {}), issues)
        return issues

    def _validate_nlp(self, nlp_results: dict[str, Any], issues: list[ValidationIssue]) -> None:
        if not isinstance(nlp_results, dict):
            return
        for capability, payload in nlp_results.items():
            if not isinstance(payload, dict):
                continue
            for item in payload.get("items", []):
                if isinstance(item, dict):
                    confidence = item.get("confidence")
                    if confidence is not None and confidence < self.min_nlp_confidence:
                        issues.append(
                            ValidationIssue(
                                field=f"nlp.{capability}",
                                reason=f"NLP confidence {confidence} is below threshold {self.min_nlp_confidence}.",
                            )
                        )

    def _validate_samples(self, results: dict[str, Any], issues: list[ValidationIssue]) -> None:
        for tool_name in ("analytics", "snowflake"):
            tool_dict = results.get(tool_name, {})
            if not isinstance(tool_dict, dict):
                continue
            for action, payload in tool_dict.items():
                if not isinstance(payload, dict):
                    continue
                sample_size = payload.get("sample_size")
                if sample_size is not None and sample_size < self.min_sample_size:
                    issues.append(
                        ValidationIssue(
                            field=f"{tool_name}.{action}",
                            reason=f"Sample size {sample_size} is below threshold {self.min_sample_size}.",
                        )
                    )

    def _validate_rag(self, rag_results: dict[str, Any], issues: list[ValidationIssue]) -> None:
        if not isinstance(rag_results, dict):
            return
        for action, payload in rag_results.items():
            if isinstance(payload, dict) and not payload.get("results"):
                issues.append(ValidationIssue(field=f"vector_db.{action}", reason="No relevant context found."))

