from typing import Any
from backend.algorithms.analytics_engine import AnalyticsEngine

class ContextBuilder:
    def __init__(self):
        self.engine = AnalyticsEngine()

    def build(self, results: dict[str, Any]) -> dict[str, Any]:
        analytics_data = self._merge_structured(results.get("analytics", {}), results.get("snowflake", {}))
        
        # Inject live topic cluster summaries if not present
        if "topic_clusters" not in analytics_data:
            try:
                analysis = self.engine.run_dynamic_analysis()
                topics = analysis.get("topic_summaries", [])
                if topics:
                    analytics_data["topic_clusters"] = topics
                    analytics_data["kpi_metrics"] = analysis.get("kpi_metrics", {})
            except Exception:
                pass

        return {
            "analytics": analytics_data,
            "nlp": self._summarize_nlp(results.get("nlp", {})),
            "customer_context": self._collect_retrieved_text(results.get("vector_db", {})),
        }

    def _merge_structured(self, *sources: dict[str, Any]) -> dict[str, Any]:
        merged: dict[str, Any] = {}
        for source in sources:
            for action, payload in source.items():
                merged[action] = payload
        return merged

    def _summarize_nlp(self, nlp_results: dict[str, Any]) -> dict[str, Any]:
        summary: dict[str, Any] = {}
        for capability, payload in nlp_results.items():
            if isinstance(payload, dict) and "active_clusters" in payload:
                summary["active_clusters"] = payload["active_clusters"]
            items = payload.get("items", []) if isinstance(payload, dict) else []
            if items:
                summary[capability] = items[0]
        return summary

    def _collect_retrieved_text(self, vector_results: dict[str, Any]) -> list[str]:
        context: list[str] = []
        for payload in vector_results.values():
            if isinstance(payload, dict):
                context.extend(payload.get("results", []))
        return context
