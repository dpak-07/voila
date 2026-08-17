from typing import Any, Optional


class ContextBuilder:
    def __init__(self, engine: Optional[Any] = None):
        self._engine = engine

    @property
    def engine(self):
        if self._engine is None:
            from backend.algorithms.analytics_engine import AnalyticsEngine
            self._engine = AnalyticsEngine()
        return self._engine

    def build(self, results: dict[str, Any]) -> dict[str, Any]:
        analytics_data = self._merge_structured(results.get("analytics", {}), results.get("snowflake", {}))

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
            if not isinstance(source, dict):
                continue
            # Skip errored tool results
            if source.get("status") == "error":
                continue
            for action, payload in source.items():
                merged[action] = payload
        return merged

    def _summarize_nlp(self, nlp_results: dict[str, Any]) -> dict[str, Any]:
        summary: dict[str, Any] = {}
        if not isinstance(nlp_results, dict) or nlp_results.get("status") == "error":
            return summary
        for capability, payload in nlp_results.items():
            if not isinstance(payload, dict):
                continue
            if "active_clusters" in payload:
                summary["active_clusters"] = payload["active_clusters"]
            items = payload.get("items", [])
            if items:
                summary[capability] = items[0]
        return summary

    def _collect_retrieved_text(self, vector_results: dict[str, Any]) -> list[str]:
        context: list[str] = []
        for payload in vector_results.values():
            if isinstance(payload, list):
                context.extend(payload)
            elif isinstance(payload, dict):
                context.extend(payload.get("results", []) or payload.get("documents", []))
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
