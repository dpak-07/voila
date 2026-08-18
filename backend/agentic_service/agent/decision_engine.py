from backend.agentic_service.schemas.query import QueryValidationResult, ToolDecision


class DecisionEngine:
    TOOL_ORDER = ["analytics", "snowflake", "nlp", "vector_db"]

    def decide(self, validation: QueryValidationResult) -> ToolDecision:
        tools: list[str] = []
        actions: dict[str, list[str]] = {}

        if validation.query_type in {"executive_dashboard", "general_insight", "customer_pain_points", "sentiment_driver_analysis", "issue_prioritization", "kpi_summary"}:
            tools.extend(["analytics", "snowflake", "nlp", "vector_db"])
            actions["analytics"] = [
                "kpi_summary",
                "topics",
                "pain_points",
                "root_causes",
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
            actions["snowflake"] = ["kpi_data", "sentiment_trend", "issue_volume", "issue_growth"]
            actions["nlp"] = ["sentiment", "intent", "topics", "pain_points", "entities"]
            actions["vector_db"] = ["customer_conversations", "issue_context", "similar_complaints"]

        if validation.metrics_required:
            if "analytics" not in tools:
                tools.append("analytics")
                actions["analytics"] = ["kpi_summary"] + validation.metrics_required + (["topics"] if validation.query_type == "customer_pain_points" else [])
            else:
                if "kpi_summary" not in actions["analytics"]:
                    actions["analytics"].insert(0, "kpi_summary")
                if "topics" not in actions["analytics"] and validation.query_type == "customer_pain_points":
                    actions["analytics"].append("topics")
            if "snowflake" not in tools:
                tools.append("snowflake")
                actions["snowflake"] = validation.metrics_required

        if validation.nlp_capabilities and "nlp" not in tools:
            tools.append("nlp")
            actions["nlp"] = validation.nlp_capabilities

        if validation.contextual_requirements and "vector_db" not in tools:
            tools.append("vector_db")
            actions["vector_db"] = validation.contextual_requirements

        ordered_tools = [tool for tool in self.TOOL_ORDER if tool in tools]
        return ToolDecision(
            query_type=validation.query_type,
            required_tools=ordered_tools,
            required_actions=actions,
            rationale=f"Selected tools for {validation.query_type} based on required metrics, NLP, and context.",
        )
