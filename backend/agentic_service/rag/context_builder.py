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

        # Flatten tool results into a unified analytics structure
        # so downstream consumers can access kpi_metrics, topic_clusters, etc. directly
        if isinstance(analytics_data, dict):
            kpi_metrics = {}
            kpi_summary = analytics_data.get("kpi_summary", {})
            if isinstance(kpi_summary, dict) and "kpi_summary" in kpi_summary:
                kpi_summary = kpi_summary["kpi_summary"]
            if isinstance(kpi_summary, dict):
                kpi_metrics.update(kpi_summary)

            # Pull single metric action values into kpi_metrics
            if "response_time" in analytics_data and isinstance(analytics_data["response_time"], dict):
                val = analytics_data["response_time"].get("average_response_time_minutes")
                if val is not None:
                    kpi_metrics["avg_response_time_minutes"] = val

            if "resolution_rate" in analytics_data and isinstance(analytics_data["resolution_rate"], dict):
                val = analytics_data["resolution_rate"].get("resolution_rate")
                if val is not None:
                    kpi_metrics["resolution_rate"] = val

            if "escalation_rate" in analytics_data and isinstance(analytics_data["escalation_rate"], dict):
                val = analytics_data["escalation_rate"].get("escalation_rate")
                if val is not None:
                    kpi_metrics["escalation_rate"] = val

            if "reopen_rate" in analytics_data and isinstance(analytics_data["reopen_rate"], dict):
                val = analytics_data["reopen_rate"].get("reopen_rate")
                if val is not None:
                    kpi_metrics["reopen_rate"] = val

            if "fcr" in analytics_data and isinstance(analytics_data["fcr"], dict):
                val = analytics_data["fcr"].get("first_contact_resolution_rate")
                if val is not None:
                    kpi_metrics["fcr_rate"] = val
                    kpi_metrics.setdefault("resolution_rate", val)

            if kpi_metrics:
                analytics_data["kpi_metrics"] = kpi_metrics

            # Extract topic clusters if returned under topics/topic_clusters
            topics = analytics_data.get("topics") or analytics_data.get("topic_clusters")
            if isinstance(topics, dict) and "topic_clusters" in topics:
                analytics_data["topic_clusters"] = topics["topic_clusters"]
            elif isinstance(topics, list):
                analytics_data["topic_clusters"] = topics

            pain_points = analytics_data.get("pain_points") or analytics_data.get("customer_pain_points")
            if isinstance(pain_points, dict) and "customer_pain_points" in pain_points:
                analytics_data["customer_pain_points"] = pain_points["customer_pain_points"]
            elif isinstance(pain_points, list):
                analytics_data["customer_pain_points"] = pain_points

            recs = analytics_data.get("recommendations")
            if isinstance(recs, dict) and "recommendations" in recs:
                analytics_data["recommendations"] = recs["recommendations"]

            causes = analytics_data.get("root_causes") or analytics_data.get("root_cause_analysis")
            if isinstance(causes, dict) and "root_cause_analysis" in causes:
                analytics_data["root_cause_analysis"] = causes["root_cause_analysis"]

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
            if "top_pain_points" in payload:
                summary["top_pain_points"] = payload["top_pain_points"]
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
