from typing import Any


class ContextBuilder:
    def build(self, results: dict[str, Any]) -> dict[str, Any]:
        return {
            "analytics": self._merge_structured(results.get("analytics", {}), results.get("snowflake", {})),
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
            items = payload.get("items", [])
            if not items:
                continue
            summary[capability] = items[0]
        return summary

    def _collect_retrieved_text(self, vector_results: dict[str, Any]) -> list[str]:
        context: list[str] = []
        for payload in vector_results.values():
            context.extend(payload.get("results", []))
        return context
