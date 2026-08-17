from backend.agentic_service.schemas.query import QueryValidationResult, ToolDecision


class DecisionEngine:
    def decide(self, validation: QueryValidationResult) -> ToolDecision:
        tools: list[str] = []
        actions: dict[str, list[str]] = {}

        if validation.query_type in {"executive_dashboard", "general_insight"}:
            tools.extend(["analytics", "nlp", "vector_db"])
            actions["analytics"] = [
                "kpi_summary",
                "response_time",
                "resolution_rate",
                "escalation_rate",
                "reopen_rate",
                "fcr",
                "issue_trends",
                "emerging_issues",
                "recurring_issues",
                "priorities",
                "solution_impact",
            ]
            actions["nlp"] = ["sentiment", "intent", "topics", "pain_points", "entities"]
            actions["vector_db"] = ["customer_conversations", "issue_context", "similar_complaints"]

        if validation.metrics_required and "analytics" not in tools:
            tools.append("analytics")
            actions["analytics"] = validation.metrics_required

        if validation.nlp_capabilities and "nlp" not in tools:
            tools.append("nlp")
            actions["nlp"] = validation.nlp_capabilities

        if validation.contextual_requirements and "vector_db" not in tools:
            tools.append("vector_db")
            actions["vector_db"] = validation.contextual_requirements

        ordered_tools = [tool for tool in ["analytics", "nlp", "vector_db"] if tool in tools]
        return ToolDecision(
            query_type=validation.query_type,
            required_tools=ordered_tools,
            required_actions=actions,
            rationale=f"Selected tools for {validation.query_type} based on required metrics, NLP, and context.",
        )
