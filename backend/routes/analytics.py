from fastapi import APIRouter, Query, Depends, HTTPException
from typing import Optional, Any, Dict, List
from pymongo import MongoClient

from backend.config.settings import settings
from backend.algorithms.analytics_engine import AnalyticsEngine
from backend.auth.dependencies import get_current_user_optional

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"]
)

engine = AnalyticsEngine()

@router.get("/runs")
def list_dataset_runs(
    current_user: dict = Depends(get_current_user_optional)
):
    """Lists all uploaded dataset versions and their metadata for historical analysis."""
    user = current_user.get("username", "deepak") if current_user else "deepak"
    runs = engine.get_latest_runs(user=user, limit=20)
    return {"status": "success", "runs": runs, "count": len(runs)}

@router.get("/compare")
def compare_dataset_runs(
    current_run_id: Optional[str] = Query(None, description="Current/latest run ID to evaluate"),
    previous_run_id: Optional[str] = Query(None, description="Previous run ID to compare against"),
    current_user: dict = Depends(get_current_user_optional)
):
    """Compares the active dataset with a previous dataset using pre-calculated metric signatures."""
    user = current_user.get("username", "deepak") if current_user else "deepak"
    comparison = engine.compare_runs(user=user, current_run_id=current_run_id, previous_run_id=previous_run_id)
    if comparison.get("status") == "error":
        raise HTTPException(status_code=400, detail=comparison.get("message"))
    return comparison

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
    user = current_user.get("username", "deepak") if current_user else "deepak"
    period = time_period.default if hasattr(time_period, "default") else str(time_period or "weekly")
    filters = {"company": company, "product": product, "region": region, "user": user, "time_period": period, "run_id": run_id}
    analysis = engine.get_analysis_hub(user=user, run_id=run_id, filters=filters)
    return {
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
        "llm_summary": analysis.get("llm_summary", ""),
        "filters": filters
    }

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
    user = current_user.get("username", "deepak") if current_user else "deepak"
    filters = {
        "time_period": granularity,
        "run_id": run_id,
        "company": company,
        "product": product,
        "region": region,
        "sentiment": sentiment,
        "user": user
    }
    analysis = engine.run_dynamic_analysis(filters=filters, run_id=run_id, user=user)
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
    """Fetches topic clusters, BERTopic keywords, and pain point volumes."""
    user = current_user.get("username", "deepak") if current_user else "deepak"
    filters = {"company": company, "product": product, "region": region, "user": user, "run_id": run_id}
    analysis = engine.get_analysis_hub(user=user, run_id=run_id, filters=filters)
    return {
        "status": "success",
        "topic_summaries": analysis.get("topic_summaries", []),
        "filters": filters
    }

@router.get("/status")
def get_pipeline_status(
    current_user: dict = Depends(get_current_user_optional)
):
    """Fetches real-time status and execution history of the data ingestion pipeline."""
    try:
        client = MongoClient(settings.mongo_uri)
        db = client[settings.mongo_db]
        cursor = db["pipeline_status"].find({}).sort("timestamp", -1).limit(10)
        logs = list(cursor)
        for log in logs:
            log["_id"] = str(log["_id"])
        return {"status": "success", "pipeline_logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

