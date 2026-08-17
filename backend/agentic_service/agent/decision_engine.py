from typing import Any, Dict, List
from backend.agentic_service.schemas.query import QueryValidationResult, ToolDecision


class DecisionEngine:
    def decide(self, validation: QueryValidationResult) -> ToolDecision:
        tools: list[str] = []
        actions: dict[str, list[str]] = {}

        # Default multi-perspective tools for dashboard and general insights
        if validation.query_type in {"executive_dashboard", "general_insight"}:
            tools.extend(["analytics", "nlp", "vector_db"])
            actions["analytics"] = [
                "kpi_summary",
                "response_time",
                "sla_turnaround",
                "resolution_rate",
                "escalation_rate",
                "reopen_rate",
                "fcr",
                "csat_proxy",
                "sentiment",
                "issue_trends",
                "emerging_issues",
                "recurring_issues",
                "priorities",
                "root_causes",
                "cluster_sentiment_stats",
                "dimension_breakdowns",
                "solution_impact",
                "available_dimensions",
            ]
            actions["nlp"] = ["sentiment", "intent", "topics", "pain_points", "entities"]
            actions["vector_db"] = ["customer_conversations", "issue_context", "similar_complaints"]

        if validation.metrics_required and "analytics" not in tools:
            tools.append("analytics")
            actions["analytics"] = list(validation.metrics_required)
            # Always ensure available dimensions are known
            if "available_dimensions" not in actions["analytics"]:
                actions["analytics"].append("available_dimensions")

        if validation.nlp_capabilities and "nlp" not in tools:
            tools.append("nlp")
            actions["nlp"] = list(validation.nlp_capabilities)

        if validation.contextual_requirements and "vector_db" not in tools:
            tools.append("vector_db")
            actions["vector_db"] = list(validation.contextual_requirements)

        # Fallback to analytics if no tool selected
        if not tools:
            tools = ["analytics"]
            actions["analytics"] = ["kpi_summary", "available_dimensions"]

        ordered_tools = [tool for tool in ["analytics", "nlp", "vector_db"] if tool in tools]
        
        metadata: Dict[str, Any] = {
            "query_type": validation.query_type,
            "time_period": validation.time_period,
            "year": validation.year,
            "company": validation.company,
            "product": validation.product,
            "region": validation.region,
            "topic": validation.topic,
        }

        return ToolDecision(
            query_type=validation.query_type,
            required_tools=ordered_tools,
            required_actions=actions,
            rationale=f"Routing query_type='{validation.query_type}' to tools: {', '.join(ordered_tools)}.",
            metadata=metadata,
        )
