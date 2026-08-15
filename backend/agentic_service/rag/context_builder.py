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
                    analytics_data["cluster_sentiment_stats"] = analysis.get("cluster_sentiment_stats", [])
                    analytics_data["kpi_metrics"] = analysis.get("kpi_metrics", {})
                    analytics_data["recommendations"] = analysis.get("recommendations", [])
                    analytics_data["root_cause_analysis"] = analysis.get("root_cause_analysis", [])
                    analytics_data["dimension_breakdowns"] = analysis.get("dimension_breakdowns", {})
                    analytics_data["executive_summary"] = analysis.get("llm_summary", "")
            except Exception:
                pass

        retrieved = self._collect_retrieved_text(results.get("vector_db", {}))
        return {
            "analytics": analytics_data,
            "nlp": self._summarize_nlp(results.get("nlp", {})),
            "customer_context": retrieved,
            "rag_summary_context": self._summarize_retrieved_context(retrieved),
            "coordination": {
                "analytics_source": "postgres_processed_or_cached",
                "warehouse_source": "snowflake_when_configured_else_postgres",
                "retrieval_source": "qdrant_when_available_else_postgres_lexical",
                "summary_policy": "Use KPI metrics for scale, cluster_sentiment_stats for per-topic counts/complaints/escalations, and RAG snippets only as qualitative evidence.",
            },
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
        deduped = []
        seen = set()
        for item in context:
            text = item.get("text") if isinstance(item, dict) else str(item)
            text = (text or "").strip()
            if not text or text in seen:
                continue
            seen.add(text)
            deduped.append(text[:500])
            if len(deduped) >= 12:
                break
        return deduped

    def _summarize_retrieved_context(self, snippets: list[str]) -> dict[str, Any]:
        return {
            "snippet_count": len(snippets),
            "sample_evidence": snippets[:5],
            "usage": "Representative conversation snippets for grounding the executive summary and recommendations.",
        }
