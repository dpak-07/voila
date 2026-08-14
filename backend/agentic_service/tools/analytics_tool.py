from typing import Any, Dict, List
from backend.algorithms.analytics_engine import AnalyticsEngine

class AnalyticsTool:
    """Live analytics interface strictly connected to backend database records."""

    def __init__(self):
        self.engine = AnalyticsEngine()

    def _get_engine_analysis(self, **filters) -> Dict[str, Any]:
        """Runs dynamic DB analysis via the AnalyticsEngine."""
        try:
            return self.engine.run_dynamic_analysis(filters)
        except Exception:
            return {}

    def get_kpi_summary(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        kpis = analysis.get("kpi_metrics", {})
        return {"kpi_summary": kpis, "filters": filters}

    def get_response_time(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        kpis = analysis.get("kpi_metrics", {})
        val = kpis.get("avg_response_time_minutes", 0.0)
        return {"average_response_time_minutes": val, "filters": filters}

    def get_resolution_rate(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        kpis = analysis.get("kpi_metrics", {})
        val = kpis.get("resolution_rate", 0.0)
        return {"resolution_rate": val, "filters": filters}

    def get_escalation_rate(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        kpis = analysis.get("kpi_metrics", {})
        val = kpis.get("escalation_rate", 0.0)
        return {"escalation_rate": val, "filters": filters}

    def get_reopen_rate(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        kpis = analysis.get("kpi_metrics", {})
        val = kpis.get("reopen_rate", 0.0)
        return {"reopen_rate": val, "filters": filters}

    def get_fcr(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        kpis = analysis.get("kpi_metrics", {})
        val = kpis.get("fcr_rate", 0.0)
        return {"first_contact_resolution_rate": val, "filters": filters}

    def get_issue_trends(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        trends = analysis.get("trends", {})
        records = trends.get("trends", [])
        return {"issue_trends": records, "granularity": trends.get("granularity", "daily"), "filters": filters}

    def get_emerging_issues(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        summaries = analysis.get("topic_summaries", [])
        return {"emerging_issues": summaries, "filters": filters}

    def get_recurring_issues(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        summaries = analysis.get("topic_summaries", [])
        return {"recurring_issues": summaries, "filters": filters}

    def get_priorities(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        summaries = analysis.get("topic_summaries", [])
        return {"priorities": summaries, "filters": filters}

    def get_solution_impact(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        summaries = analysis.get("topic_summaries", [])
        return {"solution_impact": summaries, "filters": filters}

    def run(self, metrics: list[str], **filters) -> dict:
        handlers = {
            "kpi_summary": self.get_kpi_summary,
            "response_time": self.get_response_time,
            "resolution_rate": self.get_resolution_rate,
            "escalation_rate": self.get_escalation_rate,
            "reopen_rate": self.get_reopen_rate,
            "fcr": self.get_fcr,
            "issue_trends": self.get_issue_trends,
            "emerging_issues": self.get_emerging_issues,
            "recurring_issues": self.get_recurring_issues,
            "priorities": self.get_priorities,
            "solution_impact": self.get_solution_impact,
        }
        return {metric: handlers[metric](**filters) for metric in metrics if metric in handlers}
