from backend.agentic_service.schemas.query import QueryRequest, QueryValidationResult


FIELD_REQUIREMENTS = {
    "response_time": {"created_at", "response_tweet_id", "in_response_to_tweet_id"},
    "resolution_rate": {"resolution_status", "ticket_status"},
    "escalation_rate": {"escalation_status"},
    "reopen_rate": {"reopen_status", "status_history"},
    "fcr": {"first_contact_resolution", "contact_count"},
    "sentiment": {"text"},
    "sentiment_trend": {"text", "created_at"},
    "issue_trends": {"text", "created_at"},
    "emerging_issues": {"text", "created_at"},
    "recurring_issues": {"text", "created_at"},
    "priorities": {"text", "created_at"},
    "kpi_summary": {"created_at", "text"},
}

FIELD_ALIASES = {
    "conversation_text": {"conversation_text", "text", "message", "tweet_text", "clean_text"},
    "text": {"text", "conversation_text", "message", "tweet_text", "clean_text"},
    "response_tweet_id": {"response_tweet_id", "reply_tweet_id", "response_time_minutes", "average_response_time_minutes", "first_response_time_minutes"},
    "in_response_to_tweet_id": {"in_response_to_tweet_id", "parent_tweet_id", "response_time_minutes", "average_response_time_minutes", "first_response_time_minutes"},
    "resolution_status": {"resolution_status", "resolution_flag", "resolved", "fcr"},
    "ticket_status": {"ticket_status", "resolution_status", "resolution_flag", "resolved", "fcr"},
    "escalation_status": {"escalation_status", "escalated", "escalation_flag", "priority", "sentiment"},
    "reopen_status": {"reopen_status", "reopened", "reopened_after_solution"},
    "status_history": {"status_history", "reopen_status", "reopened", "reopened_after_solution"},
    "first_contact_resolution": {"first_contact_resolution", "fcr", "resolution_flag", "resolved"},
    "contact_count": {"contact_count", "first_contact_resolution", "fcr", "resolution_flag", "resolved"},
}


class QueryValidator:
    def validate(self, request: QueryRequest) -> QueryValidationResult:
        query = request.question.lower()
        query_type = self._query_type(query)
        metrics = self._metrics_required(query, query_type)
        nlp_capabilities = self._nlp_capabilities(query, query_type)
        contextual_requirements = self._contextual_requirements(query, query_type)
        required_data = self._required_data(metrics, nlp_capabilities, contextual_requirements)
        missing = self._missing_fields(required_data, request.dataset_fields)

        if missing:
            return QueryValidationResult(
                status="insufficient_data",
                query_type=query_type,
                metrics_required=metrics,
                nlp_capabilities=nlp_capabilities,
                contextual_requirements=contextual_requirements,
                time_period=request.time_period or self._time_period(query),
                company=request.company,
                product=request.product,
                region=request.region,
                can_answer=False,
                reason=f"Required data is not available: {', '.join(missing)}",
                required_data=missing,
            )

        return QueryValidationResult(
            status="valid",
            query_type=query_type,
            metrics_required=metrics,
            nlp_capabilities=nlp_capabilities,
            contextual_requirements=contextual_requirements,
            time_period=request.time_period or self._time_period(query),
            company=request.company,
            product=request.product,
            region=request.region,
            can_answer=True,
        )

    def _query_type(self, query: str) -> str:
        if "dashboard" in query or "executive summary" in query or "outcome" in query:
            return "executive_dashboard"
        if "response time" in query or "sla" in query or "wait time" in query or "latency" in query:
            return "response_time"
        if "reopen" in query:
            return "reopen_rate"
        if "resolution" in query or "resolve" in query or "solved" in query:
            return "resolution_rate"
        if "escalation" in query or "escalat" in query:
            return "escalation_rate"
        if "fcr" in query or "first contact" in query or "first response" in query:
            return "fcr"
        if "why" in query and "sentiment" in query:
            return "sentiment_driver_analysis"
        if "emerging" in query or "new issue" in query:
            return "emerging_issues"
        if "recurring" in query:
            return "recurring_issues"
        if "priority" in query or "prioritize" in query or "p0" in query or "p1" in query or "critical" in query:
            return "issue_prioritization"
        if "example" in query or "similar" in query or "show me" in query:
            return "conversation_examples"
        if any(w in query for w in [
            "cluster", "cluserter", "topic", "topics", "category", "categories",
            "complain", "pain", "problem", "issues", "what are", "top",
            "billing", "charge", "invoice", "delivery", "order", "crash", "bug",
            "unhappy", "frustrated", "angry", "dissatisfied", "friction",
            "why are", "why do", "why is", "what is causing", "root cause"
        ]):
            return "customer_pain_points"
        if "kpi" in query or "summary" in query or "overview" in query or "metrics" in query:
            return "kpi_summary"
        return "general_insight"

    def _metrics_required(self, query: str, query_type: str) -> list[str]:
        mapping = {
            "response_time": ["response_time"],
            "reopen_rate": ["reopen_rate"],
            "resolution_rate": ["resolution_rate"],
            "escalation_rate": ["escalation_rate"],
            "fcr": ["fcr"],
            "sentiment_driver_analysis": ["sentiment_trend", "issue_trends"],
            "emerging_issues": ["emerging_issues"],
            "recurring_issues": ["recurring_issues"],
            "issue_prioritization": ["priorities"],
            "kpi_summary": ["kpi_summary"],
            "customer_pain_points": ["priorities", "emerging_issues", "recurring_issues", "kpi_summary"],
            "executive_dashboard": ["kpi_summary", "response_time", "sentiment_trend", "issue_trends", "priorities"],
        }
        metrics = mapping.get(query_type, [])
        if "solution" in query and "impact" in query:
            metrics.append("solution_impact")
        return metrics

    def _nlp_capabilities(self, query: str, query_type: str) -> list[str]:
        if query_type in {"customer_pain_points", "sentiment_driver_analysis", "emerging_issues", "executive_dashboard"}:
            return ["sentiment", "intent", "topics", "pain_points", "entities"]
        if query_type == "conversation_examples":
            return ["intent", "topics", "entities"]
        if "sentiment" in query:
            return ["sentiment"]
        return []

    def _contextual_requirements(self, query: str, query_type: str) -> list[str]:
        if query_type == "conversation_examples":
            return ["similar_complaints"]
        if query_type in {"customer_pain_points", "sentiment_driver_analysis", "executive_dashboard"}:
            return ["customer_conversations", "issue_context"]
        if "product" in query:
            return ["product_context"]
        return []

    def _required_data(
        self,
        metrics: list[str],
        nlp_capabilities: list[str],
        contextual_requirements: list[str],
    ) -> list[str]:
        required: set[str] = set()
        for metric in metrics:
            required.update(FIELD_REQUIREMENTS.get(metric, set()))
        if nlp_capabilities or contextual_requirements:
            required.add("text")
        return sorted(required)

    def _missing_fields(self, required_data: list[str], dataset_fields: list[str]) -> list[str]:
        if not dataset_fields:
            return []
        available = {field.lower() for field in dataset_fields}
        return [field for field in required_data if not self._field_available(field, available)]

    def _field_available(self, required_field: str, available: set[str]) -> bool:
        aliases = FIELD_ALIASES.get(required_field, {required_field})
        return bool({alias.lower() for alias in aliases} & available)

    def _time_period(self, query: str) -> str | None:
        import re
        year_match = re.search(r"\b(201[0-9]|202[0-9])\b", query)
        if year_match:
            return year_match.group(1)
        for phrase in ("today", "this week", "last week", "this month", "last month", "monthly", "weekly", "daily", "overall"):
            if phrase in query:
                return phrase
        return None
