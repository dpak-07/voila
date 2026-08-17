from typing import Any, Dict, List, Optional
from backend.agentic_service.schemas.confidence import DataConfidence


class AnalyticsTool:
    """Live analytics interface strictly connected to backend database records."""

    def __init__(self, engine: Optional[Any] = None):
        self._engine = engine
        self._analysis_cache: Dict[str, Any] = {}

    @property
    def engine(self):
        if self._engine is None:
            from backend.algorithms.analytics_engine import AnalyticsEngine
            self._engine = AnalyticsEngine()
        return self._engine

    def _get_engine_analysis(self, **filters) -> Dict[str, Any]:
        """Runs dynamic DB analysis via the AnalyticsEngine with caching."""
        tp = str(filters.get("time_period") or "").strip()
        if tp.isdigit() and len(tp) == 4:
            filters["year"] = int(tp)
            filters["time_period"] = "yearly"

        cache_key = str(sorted(filters.items()))
        if cache_key in self._analysis_cache:
            return self._analysis_cache[cache_key]
        try:
            res = self.engine.run_dynamic_analysis(filters)
            self._analysis_cache[cache_key] = res
            return res
        except Exception:
            return {"status": "no_data_available", "data_status": DataConfidence.NO_DATA_AVAILABLE.value}

    def get_kpi_summary(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        if analysis.get("status") == "no_data_available":
            return {
                "status": "no_data_available",
                "data_status": DataConfidence.NO_DATA_AVAILABLE.value,
                "kpi_summary": {},
                "filters": filters
            }
        kpis = analysis.get("kpi_metrics", {})
        return {
            "kpi_summary": kpis,
            "data_status": DataConfidence.MEASURED.value,
            "filters": filters
        }

    def get_response_time(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        if analysis.get("status") == "no_data_available":
            return {
                "status": "no_data_available",
                "data_status": DataConfidence.NO_DATA_AVAILABLE.value,
                "average_response_time_minutes": None,
                "filters": filters
            }
        kpis = analysis.get("kpi_metrics", {})
        val = kpis.get("avg_response_time_minutes")
        return {
            "average_response_time_minutes": val,
            "data_status": DataConfidence.MEASURED.value if val is not None else DataConfidence.NO_DATA_AVAILABLE.value,
            "filters": filters
        }

    def get_resolution_rate(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        if analysis.get("status") == "no_data_available":
            return {
                "status": "no_data_available",
                "data_status": DataConfidence.NO_DATA_AVAILABLE.value,
                "resolution_rate": 0.0,
                "filters": filters
            }
        kpis = analysis.get("kpi_metrics", {})
        val = kpis.get("resolution_rate", 0.0)
        return {
            "resolution_rate": val,
            "data_status": DataConfidence.MEASURED.value,
            "filters": filters
        }

    def get_escalation_rate(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        if analysis.get("status") == "no_data_available":
            return {
                "status": "no_data_available",
                "data_status": DataConfidence.NO_DATA_AVAILABLE.value,
                "escalation_rate": 0.0,
                "filters": filters
            }
        kpis = analysis.get("kpi_metrics", {})
        val = kpis.get("escalation_rate", 0.0)
        return {
            "escalation_rate": val,
            "data_status": DataConfidence.MEASURED.value,
            "filters": filters
        }

    def get_reopen_rate(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        if analysis.get("status") == "no_data_available":
            return {
                "status": "no_data_available",
                "data_status": DataConfidence.NO_DATA_AVAILABLE.value,
                "reopen_rate": 0.0,
                "filters": filters
            }
        kpis = analysis.get("kpi_metrics", {})
        val = kpis.get("reopen_rate", 0.0)
        return {
            "reopen_rate": val,
            "data_status": DataConfidence.MEASURED.value,
            "filters": filters
        }

    def get_fcr(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        if analysis.get("status") == "no_data_available":
            return {
                "status": "no_data_available",
                "data_status": DataConfidence.NO_DATA_AVAILABLE.value,
                "first_contact_resolution_rate": 0.0,
                "filters": filters
            }
        kpis = analysis.get("kpi_metrics", {})
        val = kpis.get("fcr_rate", 0.0)
        return {
            "first_contact_resolution_rate": val,
            "data_status": DataConfidence.MEASURED.value,
            "filters": filters
        }

    def get_issue_trends(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        if analysis.get("status") == "no_data_available":
            return {
                "status": "no_data_available",
                "data_status": DataConfidence.NO_DATA_AVAILABLE.value,
                "issue_trends": [],
                "granularity": "daily",
                "filters": filters
            }
        trends = analysis.get("trends", {})
        records = trends.get("sentiment_trend", [])
        return {
            "issue_trends": records,
            "granularity": trends.get("granularity", "daily"),
            "data_status": DataConfidence.MEASURED.value if records else DataConfidence.NO_DATA_AVAILABLE.value,
            "filters": filters
        }

    def get_emerging_issues(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        if analysis.get("status") == "no_data_available":
            return {
                "status": "no_data_available",
                "data_status": DataConfidence.NO_DATA_AVAILABLE.value,
                "emerging_issues": [],
                "filters": filters
            }
        summaries = analysis.get("emerging_issues", [])
        return {
            "emerging_issues": summaries,
            "data_status": DataConfidence.MEASURED.value if summaries else DataConfidence.NO_DATA_AVAILABLE.value,
            "filters": filters
        }

    def get_recurring_issues(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        if analysis.get("status") == "no_data_available":
            return {
                "status": "no_data_available",
                "data_status": DataConfidence.NO_DATA_AVAILABLE.value,
                "recurring_issues": [],
                "filters": filters
            }
        summaries = analysis.get("recurring_issues", [])
        return {
            "recurring_issues": summaries,
            "data_status": DataConfidence.MEASURED.value if summaries else DataConfidence.NO_DATA_AVAILABLE.value,
            "filters": filters
        }

    def get_priorities(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        if analysis.get("status") == "no_data_available":
            return {
                "status": "no_data_available",
                "data_status": DataConfidence.NO_DATA_AVAILABLE.value,
                "priorities": [],
                "filters": filters
            }
        summaries = analysis.get("priorities", [])
        return {
            "priorities": summaries,
            "data_status": DataConfidence.MEASURED.value if summaries else DataConfidence.NO_DATA_AVAILABLE.value,
            "filters": filters
        }

    def get_solution_impact(self, **filters) -> dict:
        analysis = self._get_engine_analysis(**filters)
        if analysis.get("status") == "no_data_available":
            return {
                "status": "no_data_available",
                "data_status": DataConfidence.NO_DATA_AVAILABLE.value,
                "solution_impact": {
                    "kpi_pillars": {},
                    "recommendations": [],
                },
                "filters": filters
            }
        return {
            "solution_impact": {
                "kpi_pillars": analysis.get("kpi_pillars", {}),
                "recommendations": analysis.get("recommendations", []),
            },
            "data_status": DataConfidence.MEASURED.value,
            "filters": filters
        }

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

