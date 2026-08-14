from backend.agentic_service.schemas.query import QueryValidationResult, ToolDecision


class DecisionEngine:
    def decide(self, validation: QueryValidationResult) -> ToolDecision:
        tools: list[str] = []
        actions: dict[str, list[str]] = {}

        if validation.metrics_required:
            tools.append("analytics")
            actions["analytics"] = validation.metrics_required

        snowflake_actions = self._snowflake_actions(validation)
        if snowflake_actions:
            tools.append("snowflake")
            actions["snowflake"] = snowflake_actions

        if validation.nlp_capabilities:
            tools.append("nlp")
            actions["nlp"] = validation.nlp_capabilities

        if validation.contextual_requirements:
            tools.append("vector_db")
            actions["vector_db"] = validation.contextual_requirements

        ordered_tools = [tool for tool in ["analytics", "snowflake", "nlp", "vector_db"] if tool in tools]
        return ToolDecision(
            query_type=validation.query_type,
            required_tools=ordered_tools,
            required_actions=actions,
            rationale=f"Selected tools for {validation.query_type} based on required metrics, NLP, and context.",
        )

    def _snowflake_actions(self, validation: QueryValidationResult) -> list[str]:
        query_type = validation.query_type
        actions: list[str] = []
        if query_type in {"kpi_summary", "response_time", "resolution_rate", "reopen_rate", "fcr", "executive_dashboard"}:
            actions.append("kpi_data")
        if query_type in {"sentiment_driver_analysis", "executive_dashboard"}:
            actions.extend(["sentiment_trend", "issue_volume", "issue_growth"])
        if query_type in {"emerging_issues", "recurring_issues", "issue_prioritization", "executive_dashboard"}:
            actions.extend(["issue_volume", "issue_growth"])
        if validation.product:
            actions.append("product_metrics")
        if validation.region:
            actions.append("region_metrics")
        return actions
