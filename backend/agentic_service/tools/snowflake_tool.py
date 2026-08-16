from typing import Dict, Any, List, Optional
from backend.config.settings import settings


class SnowflakeTool:
    """Live analytical queries executing directly against Snowflake Cloud Warehouse & S3 Stage."""

    _snowflake_offline = False

    def __init__(self, engine: Optional[Any] = None):
        self._engine = engine
        self._cached_cols = {}

    @property
    def engine(self):
        if self._engine is None:
            from backend.algorithms.analytics_engine import AnalyticsEngine
            self._engine = AnalyticsEngine()
        return self._engine

    def _where_clause(self, source_table: str = None, **filters) -> tuple[str, tuple]:
        clauses = []
        params = []
        mapping = {
            "company": ["BRAND", "COMPANY", "AUTHOR_ID"],
            "product": ["PRODUCT"],
            "region": ["REGION"],
        }
        available = self._table_columns(source_table)
        for key, candidates in mapping.items():
            value = filters.get(key)
            if not value:
                continue
            col = next((c for c in candidates if c in available), None)
            if col:
                clauses.append(f"LOWER({col}) = %s")
                params.append(str(value).lower())
        return ("WHERE " + " AND ".join(clauses)) if clauses else "", tuple(params)

    def _first_available_column(self, candidates: list[str], source_table: str = None) -> Optional[str]:
        available = self._table_columns(source_table)
        return next((col for col in candidates if col in available), None)

    def _source_table(self) -> str:
        processed_cols = self._table_columns("PROCESSED_SOCIAL_MEDIA_METRICS")
        if processed_cols:
            return "PROCESSED_SOCIAL_MEDIA_METRICS"
        return "SOCIAL_MEDIA_METRICS"

    def _table_columns(self, table_name: str = None) -> set[str]:
        cache_key = table_name or "ALL"
        if cache_key in self._cached_cols:
            return self._cached_cols[cache_key]

        if table_name:
            rows = self._execute_snowflake_query("""
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = %s
            """, (table_name,))
        else:
            rows = self._execute_snowflake_query("""
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'PROCESSED_SOCIAL_MEDIA_METRICS'
               OR TABLE_NAME = 'SOCIAL_MEDIA_METRICS'
            """)
        cols = {str(r.get("COLUMN_NAME") or r.get("column_name")).upper() for r in rows or []}
        self._cached_cols[cache_key] = cols
        return cols

    def _execute_snowflake_query(self, sql: str, params: tuple = None) -> Optional[List[dict]]:
        """Direct cloud query execution against Snowflake Data Warehouse."""
        if SnowflakeTool._snowflake_offline:
            return None
        acct = (settings.snowflake_account or "").lower()
        if not (settings.snowflake_account and settings.snowflake_user and settings.snowflake_password) or "your_" in acct or "placeholder" in acct or "xy12345" in acct or "test" == acct:
            SnowflakeTool._snowflake_offline = True
            return None
        try:
            import snowflake.connector
            conn = snowflake.connector.connect(
                account=settings.snowflake_account,
                user=settings.snowflake_user,
                password=settings.snowflake_password,
                role=settings.snowflake_role or "ACCOUNTADMIN",
                warehouse=settings.snowflake_warehouse or "COMPUTE_WH",
                database=settings.snowflake_database or "SOCIAL_ANALYTICS",
                schema=settings.snowflake_schema or "PUBLIC",
                login_timeout=2,
                network_timeout=2,
                insecure_mode=True,
                client_session_keep_alive=False
            )
            cur = conn.cursor(snowflake.connector.DictCursor)
            cur.execute(sql, params)
            rows = cur.fetchall()
            conn.close()
            return rows
        except Exception as e:
            # Mark offline to prevent repeated 5-second timeouts on subsequent queries
            SnowflakeTool._snowflake_offline = True
            return None

    def get_kpi_data(self, **filters) -> dict:
        # 1. Try Direct Snowflake Cloud Query
        source_table = self._source_table()
        where_sql, params = self._where_clause(source_table=source_table, **filters)
        columns = self._table_columns(source_table)
        sentiment_col = "SENTIMENT" if "SENTIMENT" in columns else None
        inbound_col = "INBOUND" if "INBOUND" in columns else None
        response_cols = [c for c in ["RESPONSE_TIME_MINUTES", "AVERAGE_RESPONSE_TIME_MINUTES", "FIRST_RESPONSE_TIME_MINUTES"] if c in columns]
        avg_response_expr = f"AVG(COALESCE({', '.join(response_cols)}, 0))" if response_cols else "0"
        response_coverage_expr = f"AVG(CASE WHEN TRY_TO_BOOLEAN({inbound_col}) = FALSE THEN 1 ELSE 0 END) * 100" if inbound_col else "0"
        fcr_expr = "AVG(CASE WHEN TRY_TO_BOOLEAN(FCR) THEN 1 ELSE 0 END) * 100" if "FCR" in columns else "0"
        escalation_parts = [
            f"TRY_TO_BOOLEAN({col})"
            for col in ["ESCALATED", "ESCALATION_FLAG"]
            if col in columns
        ]
        escalation_expr = f"AVG(CASE WHEN {' OR '.join(escalation_parts)} THEN 1 ELSE 0 END) * 100" if escalation_parts else "0"
        reopen_expr = "AVG(CASE WHEN TRY_TO_BOOLEAN(REOPENED) THEN 1 ELSE 0 END) * 100" if "REOPENED" in columns else "0"
        positive_expr = f"COUNT(CASE WHEN LOWER({sentiment_col}) = 'positive' THEN 1 END)" if sentiment_col else "0"
        negative_expr = f"COUNT(CASE WHEN LOWER({sentiment_col}) = 'negative' THEN 1 END)" if sentiment_col else "0"
        sf_sql = f"""
        SELECT
            COUNT(*) AS TOTAL,
            {positive_expr} AS POSITIVE,
            {negative_expr} AS NEGATIVE,
            {response_coverage_expr} AS RESPONSE_COVERAGE,
            {avg_response_expr} AS AVG_RESPONSE_TIME,
            {fcr_expr} AS FCR_RATE,
            {escalation_expr} AS ESCALATION_RATE,
            {reopen_expr} AS REOPEN_RATE
        FROM {source_table}
        {where_sql};
        """
        sf_res = self._execute_snowflake_query(sf_sql, params)
        if sf_res and len(sf_res) > 0 and sf_res[0].get("TOTAL", 0) > 0:
            row = sf_res[0]
            tot = int(row.get("TOTAL", 0) or 0)
            return {
                "kpi_data": {
                    "tickets": tot,
                    "positive_sentiment_percentage": round(float(row.get("POSITIVE", 0) or 0) / max(1, tot) * 100.0, 1),
                    "negative_sentiment_percentage": round(float(row.get("NEGATIVE", 0) or 0) / max(1, tot) * 100.0, 1),
                    "resolution_rate": round(float(row.get("FCR_RATE") or row.get("RESPONSE_COVERAGE") or 0.0), 1),
                    "escalation_rate": round(float(row.get("ESCALATION_RATE") or 0.0), 1),
                    "reopen_rate": round(float(row.get("REOPEN_RATE") or 0.0), 1),
                    "avg_response_time_minutes": round(float(row.get("AVG_RESPONSE_TIME") or 0.0), 1),
                },
                "source": "snowflake_cloud",
                "data_status": "measured",
                "filters": filters
            }

        # 2. Native PostgreSQL Execution Fallback
        analysis = self.engine.run_dynamic_analysis(filters)
        kpis = analysis.get("kpi_metrics", {})
        total = kpis.get("total_conversations", 0) or kpis.get("total_records", 0)
        if total > 0:
            res_rate = float(kpis.get("resolution_rate", 0.0) or 0.0) / 100.0
            return {
                "kpi_data": {
                    "tickets": total,
                    "resolved": int(total * res_rate),
                    "positive_sentiment_percentage": float(kpis.get("positive_sentiment_percentage", 0.0) or 0.0),
                    "negative_sentiment_percentage": float(kpis.get("negative_sentiment_percentage", 0.0) or 0.0),
                    "resolution_rate": float(kpis.get("resolution_rate", 0.0) or 0.0),
                    "escalation_rate": float(kpis.get("escalation_rate", 0.0) or 0.0),
                    "reopen_rate": float(kpis.get("reopen_rate", 0.0) or 0.0),
                    "avg_response_time_minutes": float(kpis.get("avg_response_time_minutes", 0.0) or 0.0),
                },
                "source": "postgresql",
                "data_status": "measured",
                "filters": filters
            }
        return {
            "status": "no_data_available",
            "data_status": "no_data_available",
            "reason": "No KPI data available for the specified filters in Snowflake or PostgreSQL.",
            "filters": filters
        }

    def get_sentiment_trend(self, **filters) -> dict:
        # 1. Try Direct Snowflake Cloud Query
        source_table = self._source_table()
        where_sql, params = self._where_clause(source_table=source_table, **filters)
        columns = self._table_columns(source_table)
        negative_expr = "COUNT(CASE WHEN LOWER(SENTIMENT) = 'negative' THEN 1 END)" if "SENTIMENT" in columns else "0"
        sf_sql = f"""
        SELECT 
            COUNT(*) as TOTAL, 
            {negative_expr} as NEGATIVE 
        FROM {source_table}
        {where_sql};
        """
        sf_res = self._execute_snowflake_query(sf_sql, params)
        if sf_res and len(sf_res) > 0 and sf_res[0].get("TOTAL", 0) > 0:
            tot = int(sf_res[0].get("TOTAL", 0) or 0)
            neg_c = int(sf_res[0].get("NEGATIVE", 0) or 0)
            neg_pct = round((neg_c / max(1, tot) * 100.0), 1)
            return {
                "negative_sentiment": neg_pct,
                "sample_size": tot,
                "source": "snowflake_cloud",
                "data_status": "measured",
                "filters": filters
            }

        # 2. Native PostgreSQL Execution Fallback
        analysis = self.engine.run_dynamic_analysis(filters)
        kpis = analysis.get("kpi_metrics", {})
        total = int(kpis.get("total_records", 0) or kpis.get("total_conversations", 0) or 0)
        if total > 0:
            neg = float(kpis.get("negative_sentiment_percentage", 0.0) or 0.0)
            return {
                "negative_sentiment": neg,
                "sample_size": total,
                "source": "postgresql",
                "data_status": "measured",
                "filters": filters,
            }
        return {
            "status": "no_data_available",
            "data_status": "no_data_available",
            "reason": "No sentiment trend data available for the specified filters.",
            "filters": filters
        }

    def get_issue_volume(self, **filters) -> dict:
        source_table = self._source_table()
        where_sql, params = self._where_clause(source_table=source_table, **filters)
        issue_col = self._first_available_column(["TOPIC_KEYWORDS", "PAIN_POINT", "CUSTOMER_PAIN_POINT", "COMPLAINT_CATEGORY", "TOPIC", "INTENT", "ISSUE_TYPE"], source_table)
        issue_expr = f"COALESCE({issue_col}, 'General')" if issue_col else "'General'"
        sf_sql = f"""
        SELECT {issue_expr} AS ISSUE,
               COUNT(*) AS COUNT
        FROM {source_table}
        {where_sql}
        GROUP BY ISSUE
        ORDER BY COUNT DESC
        LIMIT 10;
        """
        sf_res = self._execute_snowflake_query(sf_sql, params)
        if sf_res:
            return {
                "issue_volume": [{"issue": r.get("ISSUE") or r.get("issue"), "count": int(r.get("COUNT") or r.get("count") or 0)} for r in sf_res],
                "source": "snowflake_cloud",
                "data_status": "measured",
                "filters": filters,
            }
        analysis = self.engine.run_dynamic_analysis(filters)
        topics = analysis.get("topic_summaries", [])
        if topics:
            return {
                "issue_volume": [{"issue": t.get("topic_keywords", "General"), "count": t.get("volume", 0)} for t in topics],
                "source": "postgresql",
                "data_status": "measured",
                "filters": filters
            }
        return {
            "status": "no_data_available",
            "data_status": "no_data_available",
            "issue_volume": [],
            "reason": "No issue volume data available.",
            "filters": filters
        }

    def get_issue_growth(self, **filters) -> dict:
        analysis = self.engine.run_dynamic_analysis(filters)
        topics = analysis.get("topic_summaries", [])
        if topics:
            return {
                "issue_growth": [{"issue": t.get("topic_keywords", "General"), "growth": float(t.get("pain_score", 0.0))} for t in topics[:3]],
                "source": "postgresql",
                "data_status": "measured",
                "filters": filters
            }
        return {
            "status": "no_data_available",
            "data_status": "no_data_available",
            "issue_growth": [],
            "reason": "No issue growth data available.",
            "filters": filters
        }

    def get_product_metrics(self, **filters) -> dict:
        analysis = self.engine.run_dynamic_analysis(filters)
        breakdown = analysis.get("dimension_breakdowns", {}).get("product", [])
        if breakdown:
            return {"product_metrics": breakdown, "source": "postgresql", "data_status": "measured", "filters": filters}
        return {
            "status": "no_data_available",
            "data_status": "no_data_available",
            "product_metrics": [],
            "reason": "No product breakdown metrics found.",
            "filters": filters
        }

    def get_region_metrics(self, **filters) -> dict:
        analysis = self.engine.run_dynamic_analysis(filters)
        breakdown = analysis.get("dimension_breakdowns", {}).get("region", [])
        if breakdown:
            return {"region_metrics": breakdown, "source": "postgresql", "data_status": "measured", "filters": filters}
        return {
            "status": "no_data_available",
            "data_status": "no_data_available",
            "region_metrics": [],
            "reason": "No region breakdown metrics found.",
            "filters": filters
        }

    def run(self, actions: list[str], **filters) -> dict:
        handlers = {
            "kpi_data": self.get_kpi_data,
            "sentiment_trend": self.get_sentiment_trend,
            "issue_volume": self.get_issue_volume,
            "issue_growth": self.get_issue_growth,
            "product_metrics": self.get_product_metrics,
            "region_metrics": self.get_region_metrics,
        }
        return {action: handlers[action](**filters) for action in actions if action in handlers}
