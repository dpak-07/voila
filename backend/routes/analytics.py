from fastapi import APIRouter, Query, Depends, HTTPException
from typing import Optional, Any, Dict
from pymongo import MongoClient

from backend.config.settings import settings
from backend.algorithms.analytics_engine import AnalyticsEngine
from backend.auth.dependencies import get_current_user_optional

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"]
)

engine = AnalyticsEngine()

@router.get("/kpis")
def get_kpis(
    time_period: str = Query("weekly", pattern="^(daily|weekly|monthly)$"),
    company: Optional[str] = Query(None),
    product: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user_optional)
):
    """Fetches global operational service KPIs, 4 KPI pillars, LLM summary, and 15 metrics."""
    user = current_user.get("username", "deepak") if current_user else "deepak"
    period = time_period.default if hasattr(time_period, "default") else str(time_period or "weekly")
    filters = {"company": company, "product": product, "region": region, "user": user, "time_period": period}
    analysis = engine.run_dynamic_analysis(filters)
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
        "company": company,
        "product": product,
        "region": region,
        "sentiment": sentiment,
        "user": user
    }
    analysis = engine.run_dynamic_analysis(filters)
    return {
        "status": "success",
        "trends": analysis.get("trends", {}),
        "filters": filters
    }

@router.get("/topics")
def get_topics(
    company: Optional[str] = Query(None),
    product: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user_optional)
):
    """Fetches topic clusters, BERTopic keywords, and pain point volumes."""
    user = current_user.get("username", "deepak") if current_user else "deepak"
    filters = {"company": company, "product": product, "region": region, "user": user}
    analysis = engine.run_dynamic_analysis(filters)
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
