from fastapi import APIRouter, Query, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional, Any, Dict, List
from datetime import datetime, date
import io

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
    user = _get_username(current_user)
    runs = engine.get_latest_runs(user=user, limit=20)
    return json_safe({"status": "success", "runs": runs, "count": len(runs)})

@router.get("/compare")
def compare_dataset_runs(
    current_run_id: Optional[str] = Query(None, description="Current/latest run ID to evaluate"),
    previous_run_id: Optional[str] = Query(None, description="Previous run ID to compare against"),
    current_user: dict = Depends(get_current_user_optional)
):
    """Compares the active dataset with a previous dataset using pre-calculated metric signatures."""
    user = _get_username(current_user)
    c_run = _clean_param(current_run_id, None)
    p_run = _clean_param(previous_run_id, None)
    comparison = engine.compare_runs(user=user, current_run_id=c_run, previous_run_id=p_run)
    if comparison.get("status") == "error":
        raise HTTPException(status_code=400, detail=comparison.get("message"))
    return json_safe(comparison)

@router.get("/kpis")
def get_kpis(
    time_period: str = Query("weekly", pattern="^(daily|weekly|monthly|overall)$"),
    run_id: Optional[str] = Query(None, description="Specific dataset run ID (defaults to latest)"),
    company: Optional[str] = Query(None),
    product: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user_optional)
):
    """Fetches global operational service KPIs, 4 KPI pillars, LLM summary, and 15 metrics."""
    user = _get_username(current_user)
    period = _clean_param(time_period, "weekly")
    r_id = _clean_param(run_id, None)
    comp = _clean_param(company, None)
    prod = _clean_param(product, None)
    reg = _clean_param(region, None)

    filters = {"company": comp, "product": prod, "region": reg, "user": user, "time_period": period, "run_id": r_id}
    analysis = engine.get_analysis_hub(user=user, run_id=r_id, filters=filters)
    return json_safe({
        "status": "success",
        "kpis": analysis.get("kpi_metrics", {}),
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
    granularity: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    run_id: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    product: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    sentiment: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user_optional)
):
    """Fetches multi-period volume trends (Daily, Weekly, Monthly) and Z-score spikes."""
    user = _get_username(current_user)
    gran = _clean_param(granularity, "daily")
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
        raise HTTPException(status_code=500, detail=str(e))
