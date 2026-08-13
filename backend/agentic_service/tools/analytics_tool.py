class AnalyticsTool:
    """Replaceable interface for the external analytics engine."""

    def get_kpi_summary(self, **filters) -> dict:
        return {"kpi_summary": {"ticket_volume": 1280, "csat": 82.4}, "filters": filters}

    def get_response_time(self, **filters) -> dict:
        return {"average_response_time_minutes": 42.5, "sample_size": 340, "filters": filters}

    def get_resolution_rate(self, **filters) -> dict:
        return {"resolution_rate": 76.2, "sample_size": 310, "filters": filters}

    def get_escalation_rate(self, **filters) -> dict:
        return {"escalation_rate": 12.8, "sample_size": 280, "filters": filters}

    def get_reopen_rate(self, **filters) -> dict:
        return {"reopen_rate": 8.4, "sample_size": 220, "filters": filters}

    def get_fcr(self, **filters) -> dict:
        return {"first_contact_resolution_rate": 64.1, "sample_size": 260, "filters": filters}

    def get_issue_trends(self, **filters) -> dict:
        return {"issue_trends": [{"issue": "app_crash", "growth": 67.2}], "filters": filters}

    def get_emerging_issues(self, **filters) -> dict:
        return {"emerging_issues": [{"issue": "login_problem", "growth": 41.0}], "filters": filters}

    def get_recurring_issues(self, **filters) -> dict:
        return {"recurring_issues": [{"issue": "refund_delay", "frequency": 86}], "filters": filters}

    def get_priorities(self, **filters) -> dict:
        return {"priorities": [{"issue": "app_crash", "priority": "high"}], "filters": filters}

    def get_solution_impact(self, **filters) -> dict:
        return {"solution_impact": [{"solution": "guided login reset", "impact": "medium"}], "filters": filters}

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
