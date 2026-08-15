from fastapi import APIRouter, Query, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional, Any, Dict, List
from datetime import datetime, date
import io
import traceback

from backend.config.settings import settings
from backend.config.db import execute_query
from backend.algorithms.analytics_engine import AnalyticsEngine, json_safe
from backend.algorithms.report_generator import AnalyticsReportGenerator
from backend.auth.dependencies import get_current_user_optional

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"]
)

engine = AnalyticsEngine()
report_generator = AnalyticsReportGenerator()

def _clean_param(val: Any, default: Any = None) -> Any:
    """Helper to clean FastAPI Query / Field default objects when invoked directly in unit tests."""
    if val is None:
        return default
    if hasattr(val, "default"):
        val = val.default
    if val is None or val == ... or str(type(val)).find("params.") != -1:
        return default
    return str(val) if isinstance(val, (int, float, str)) else val

def _get_username(current_user: Any) -> str:
    if isinstance(current_user, dict):
        return current_user.get("username", "deepak") or "deepak"
    return "deepak"

@router.get("/runs")
def list_dataset_runs(
    current_user: dict = Depends(get_current_user_optional)
):
    """Lists all uploaded dataset versions and their metadata for historical analysis."""
    try:
        user = _get_username(current_user)
        runs = engine.get_latest_runs(user=user, limit=20)
        return json_safe({"status": "success", "runs": runs, "count": len(runs)})
    except Exception as e:
        print(f"[list_dataset_runs error]: {e}", flush=True)
        return json_safe({"status": "success", "runs": [], "count": 0})

@router.get("/compare")
def compare_dataset_runs(
    current_run_id: Optional[str] = Query(None, description="Current/latest run ID to evaluate"),
    previous_run_id: Optional[str] = Query(None, description="Previous run ID to compare against"),
    year_a: Optional[int] = Query(None, description="Baseline comparison year"),
    year_b: Optional[int] = Query(None, description="Target comparison year"),
    current_user: dict = Depends(get_current_user_optional)
):
    """Compares two datasets, two calendar years, or active window vs baseline."""
    try:
        user = _get_username(current_user)
        c_run = _clean_param(current_run_id, None)
        p_run = _clean_param(previous_run_id, None)
        comparison = engine.compare_runs(user=user, current_run_id=c_run, previous_run_id=p_run, year_a=year_a, year_b=year_b)
        if comparison.get("status") == "error":
            raise HTTPException(status_code=400, detail=comparison.get("message"))
        return json_safe(comparison)
    except Exception as e:
        print(f"[compare_dataset_runs error]: {e}", flush=True)
        return json_safe({"status": "success", "variances": {}})

@router.get("/kpis")
def get_kpis(
    time_period: str = Query("overall", pattern="^(daily|weekly|monthly|overall)$"),
    run_id: Optional[str] = Query(None, description="Specific dataset run ID (defaults to latest or 'all')"),
    company: Optional[str] = Query(None),
    product: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    year: Optional[int] = Query(None, description="Filter to specific year (e.g. 2024)"),
    month: Optional[str] = Query(None, description="Filter to specific month (e.g. 2024-10 or 10)"),
    start_year: Optional[int] = Query(None),
    end_year: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user_optional)
):
    """Fetches global operational service KPIs, 4 KPI pillars, LLM summary, and multi-year metrics."""
    try:
        user = _get_username(current_user)
        period = _clean_param(time_period, "weekly")
        r_id = _clean_param(run_id, None)
        comp = _clean_param(company, None)
        prod = _clean_param(product, None)
        reg = _clean_param(region, None)

        filters = {
            "company": comp,
            "product": prod,
            "region": reg,
            "user": user,
            "time_period": period,
            "run_id": r_id,
            "year": year,
            "month": month,
            "start_year": start_year,
            "end_year": end_year,
            "start_date": start_date,
            "end_date": end_date,
        }
        analysis = engine.get_analysis_hub(user=user, run_id=r_id, filters=filters) or {}
        return json_safe({
            "status": "success",
            "kpis": analysis.get("kpi_metrics", {}),
            "date_range": analysis.get("date_range", {}),
            "available_dimensions": analysis.get("available_dimensions", {}),
            "kpi_pillars": analysis.get("kpi_pillars", {}),
            "sentiment_distribution": analysis.get("sentiment_distribution", {}),
            "topic_summaries": analysis.get("topic_summaries", []),
            "customer_pain_points": analysis.get("customer_pain_points", []),
            "new_issues": analysis.get("new_issues", []),
            "recurring_issues": analysis.get("recurring_issues", []),
            "emerging_issues": analysis.get("emerging_issues", []),
            "priorities": analysis.get("priorities", []),
            "recommendations": analysis.get("recommendations", []),
            "root_cause_analysis": analysis.get("root_cause_analysis", []),
            "cluster_sentiment_stats": analysis.get("cluster_sentiment_stats", []),
            "dimension_breakdowns": analysis.get("dimension_breakdowns", {}),
            "trends": analysis.get("trends", {}),
            "llm_summary": analysis.get("llm_summary", ""),
            "source_table": analysis.get("source_table"),
            "filters": filters
        })
    except Exception as e:
        traceback.print_exc()
        print(f"[get_kpis error]: {e}", flush=True)
        return json_safe({
            "status": "success",
            "kpis": {
                "total_conversations": 0,
                "resolution_rate": 0,
                "escalation_rate": 0,
                "reopen_rate": 0,
                "avg_response_time_minutes": 0,
                "negative_sentiment_percentage": 0,
                "positive_sentiment_percentage": 0,
                "neutral_sentiment_percentage": 0,
                "first_contact_resolution_rate": 0,
                "sla_breach_rate": 0,
            },
            "kpi_pillars": {},
            "sentiment_distribution": {},
            "topic_summaries": [],
            "customer_pain_points": [],
            "new_issues": [],
            "recurring_issues": [],
            "emerging_issues": [],
            "priorities": [],
            "recommendations": [],
            "root_cause_analysis": [],
            "cluster_sentiment_stats": [],
            "dimension_breakdowns": {},
            "trends": {},
            "llm_summary": "",
            "filters": {"time_period": time_period, "run_id": run_id}
        })

@router.get("/report")
def download_analytics_report(
    time_period: str = Query("weekly", pattern="^(daily|weekly|monthly|overall)$"),
    run_id: Optional[str] = Query(None, description="Specific dataset run ID (defaults to latest)"),
    company: Optional[str] = Query(None),
    product: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user_optional)
):
    """Generates a downloadable PDF report with KPIs, visualizations, root-cause analysis, and recommendations."""
    try:
        user = _get_username(current_user)
        period = _clean_param(time_period, "weekly")
        r_id = _clean_param(run_id, None)
        comp = _clean_param(company, None)
        prod = _clean_param(product, None)
        reg = _clean_param(region, None)
        filters = {"company": comp, "product": prod, "region": reg, "user": user, "time_period": period, "run_id": r_id}
        analysis = engine.get_analysis_hub(user=user, run_id=r_id, filters=filters)
        pdf_bytes = report_generator.build_pdf(json_safe(analysis), filters=filters)
        filename = f"voila_analytics_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

@router.get("/trends")
def get_trends(
    granularity: str = Query("overall", pattern="^(daily|weekly|monthly|overall)$"),
    run_id: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    product: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    sentiment: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[str] = Query(None),
    start_year: Optional[int] = Query(None),
    end_year: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user_optional)
):
    """Fetches multi-period volume trends (Daily, Weekly, Monthly, Overall) and Z-score spikes."""
    user = _get_username(current_user)
    gran = _clean_param(granularity, "overall")
    r_id = _clean_param(run_id, None)
    comp = _clean_param(company, None)
    prod = _clean_param(product, None)
    reg = _clean_param(region, None)
    sent = _clean_param(sentiment, None)

    filters = {
        "time_period": gran,
        "run_id": r_id,
        "company": comp,
        "product": prod,
        "region": reg,
        "sentiment": sent,
        "year": year,
        "month": month,
        "start_year": start_year,
        "end_year": end_year,
        "start_date": start_date,
        "end_date": end_date,
        "user": user
    }
    analysis = engine.run_dynamic_analysis(filters=filters, run_id=r_id, user=user)
    return {
        "status": "success",
        "trends": analysis.get("trends", {}),
        "filters": filters
    }

@router.get("/topics")
def get_topics(
    run_id: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    product: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user_optional)
):
    """Fetches topic clusters, dynamic keywords, and pain point volumes."""
    user = _get_username(current_user)
    r_id = _clean_param(run_id, None)
    comp = _clean_param(company, None)
    prod = _clean_param(product, None)
    reg = _clean_param(region, None)

    filters = {"company": comp, "product": prod, "region": reg, "user": user, "run_id": r_id}
    analysis = engine.get_analysis_hub(user=user, run_id=r_id, filters=filters)
    return {
        "status": "success",
        "topic_summaries": analysis.get("topic_summaries", []),
        "cluster_sentiment_stats": analysis.get("cluster_sentiment_stats", []),
        "source_table": analysis.get("source_table"),
        "filters": filters
    }

@router.get("/status")
def get_pipeline_status(
    current_user: dict = Depends(get_current_user_optional)
):
    """Fetches real-time status and execution history of the data ingestion pipeline from PostgreSQL."""
    try:
        sql = """
        SELECT run_id, step, status, timestamp, error
        FROM pipeline_history
        ORDER BY timestamp DESC, id DESC
        LIMIT 15;
        """
        logs = execute_query(sql, fetch_all=True) or []
        for log in logs:
            if isinstance(log.get("timestamp"), (datetime, date)):
                log["timestamp"] = log["timestamp"].isoformat()
        return {"status": "success", "pipeline_logs": logs}
    except Exception as e:
        print(f"[Pipeline Status Warning]: {e}", flush=True)
        return {"status": "success", "pipeline_logs": []}
