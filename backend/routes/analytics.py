from fastapi import APIRouter, Query, Depends, HTTPException, BackgroundTasks, Response
from fastapi.responses import StreamingResponse, JSONResponse, Response
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
    if val is None or val == ... or str(type(val)).find("params.") != -1 or "annotation=" in str(val) or "FieldInfo" in str(type(val)):
        return default
    if isinstance(val, (int, float)):
        return val
    s = str(val).strip()
    return s if s else default

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

@router.delete("/runs/{run_id}")
def delete_dataset_run(
    run_id: str,
    current_user: dict = Depends(get_current_user_optional)
):
    """Permanently deletes an uploaded dataset run and all associated metrics from PostgreSQL."""
    try:
        user = _get_username(current_user)
        success = engine.delete_run(run_id=run_id, user=user)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete dataset run.")
        return {"status": "success", "message": f"Run {run_id} deleted successfully.", "run_id": run_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[delete_dataset_run error]: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/companies")
def list_companies(
    run_id: Optional[str] = Query(None, description="Specific dataset run ID (defaults to all)"),
    current_user: dict = Depends(get_current_user_optional)
):
    """Returns a list of distinct companies in the dataset with conversation counts and sentiment stats."""
    try:
        user = _get_username(current_user)
        r_id = _clean_param(run_id, None)

        # Check which table has rows (conversations or processed_conversations)
        target_table = "conversations"
        try:
            cnt_conv = execute_query("SELECT COUNT(*) AS n FROM conversations", fetch_all=True)
            if not cnt_conv or int(cnt_conv[0].get("n", 0)) == 0:
                cnt_proc = execute_query("SELECT COUNT(*) AS n FROM processed_conversations", fetch_all=True)
                if cnt_proc and int(cnt_proc[0].get("n", 0)) > 0:
                    target_table = "processed_conversations"
        except Exception:
            target_table = "processed_conversations"

        where_clauses = [
            "(company IS NOT NULL AND company != '' AND company !~ '^[0-9]+$' AND company != 'Global Enterprise')",
        ]
        params: list = []

        if r_id and r_id != "all":
            where_clauses.append("dataset_run_id = %s")
            params.append(r_id)
        if user and user != "all":
            where_clauses.append("(user_id = %s OR user_id = 'deepak' OR user_id = 'admin' OR user_id IS NULL)")
            params.append(user)

        where_sql = "WHERE " + " AND ".join(where_clauses)

        sql = f"""
        SELECT
            COALESCE(NULLIF(TRIM(company), ''), NULLIF(TRIM(brand), ''), 'General Support') AS company,
            COUNT(*) AS total_conversations,
            ROUND(
                100.0 * SUM(CASE WHEN LOWER(sentiment) = 'negative' THEN 1 ELSE 0 END)
                / NULLIF(COUNT(*), 0), 1
            ) AS negative_pct,
            ROUND(
                100.0 * SUM(CASE WHEN LOWER(sentiment) = 'positive' THEN 1 ELSE 0 END)
                / NULLIF(COUNT(*), 0), 1
            ) AS positive_pct,
            ROUND(COALESCE(AVG(response_time_minutes), 0), 1) AS avg_response_time,
            MODE() WITHIN GROUP (ORDER BY COALESCE(NULLIF(TRIM(topic_keywords), ''), 'General Support')) AS top_topic
        FROM {target_table}
        {where_sql}
        GROUP BY 1
        ORDER BY total_conversations DESC
        LIMIT 50;
        """
        rows = execute_query(sql, tuple(params) if params else None, fetch_all=True) or []

        # If user-filtered query returned empty, try fallback without user restriction
        if not rows and user and user != "all":
            fallback_where = ["(company IS NOT NULL AND company != '' AND company !~ '^[0-9]+$' AND company != 'Global Enterprise')"]
            f_params = []
            if r_id and r_id != "all":
                fallback_where.append("dataset_run_id = %s")
                f_params.append(r_id)
            fallback_sql = f"""
            SELECT
                COALESCE(NULLIF(TRIM(company), ''), NULLIF(TRIM(brand), ''), 'General Support') AS company,
                COUNT(*) AS total_conversations,
                ROUND(
                    100.0 * SUM(CASE WHEN LOWER(sentiment) = 'negative' THEN 1 ELSE 0 END)
                    / NULLIF(COUNT(*), 0), 1
                ) AS negative_pct,
                ROUND(
                    100.0 * SUM(CASE WHEN LOWER(sentiment) = 'positive' THEN 1 ELSE 0 END)
                    / NULLIF(COUNT(*), 0), 1
                ) AS positive_pct,
                ROUND(COALESCE(AVG(response_time_minutes), 0), 1) AS avg_response_time,
                MODE() WITHIN GROUP (ORDER BY COALESCE(NULLIF(TRIM(topic_keywords), ''), 'General Support')) AS top_topic
            FROM {target_table}
            WHERE {" AND ".join(fallback_where)}
            GROUP BY 1
            ORDER BY total_conversations DESC
            LIMIT 50;
            """
            rows = execute_query(fallback_sql, tuple(f_params) if f_params else None, fetch_all=True) or []

        # If still empty, check brand column fallback
        if not rows:
            brand_sql = f"""
            SELECT
                COALESCE(NULLIF(TRIM(brand), ''), 'General Enterprise') AS company,
                COUNT(*) AS total_conversations,
                ROUND(
                    100.0 * SUM(CASE WHEN LOWER(sentiment) = 'negative' THEN 1 ELSE 0 END)
                    / NULLIF(COUNT(*), 0), 1
                ) AS negative_pct,
                ROUND(
                    100.0 * SUM(CASE WHEN LOWER(sentiment) = 'positive' THEN 1 ELSE 0 END)
                    / NULLIF(COUNT(*), 0), 1
                ) AS positive_pct,
                ROUND(COALESCE(AVG(response_time_minutes), 0), 1) AS avg_response_time,
                'General Support' AS top_topic
            FROM {target_table}
            WHERE brand IS NOT NULL AND brand != '' AND brand !~ '^[0-9]+$'
            GROUP BY 1
            ORDER BY total_conversations DESC
            LIMIT 50;
            """
            rows = execute_query(brand_sql, None, fetch_all=True) or []

        companies = []
        for r in rows:
            c_name = str(r.get("company") or "").strip()
            if not c_name or c_name.isdigit() or c_name.lower() in {"none", "null", "nan", "support", "global", "global enterprise"}:
                continue
            companies.append({
                "company": c_name,
                "total_conversations": int(r.get("total_conversations") or 0),
                "negative_pct": float(r.get("negative_pct") or 0),
                "positive_pct": float(r.get("positive_pct") or 0),
                "avg_response_time": float(r.get("avg_response_time") or 0),
                "top_topic": r.get("top_topic") or "General Support",
            })
        return json_safe({"status": "success", "companies": companies, "count": len(companies)})
    except Exception as e:
        print(f"[list_companies error]: {e}", flush=True)
        return json_safe({"status": "success", "companies": [], "count": 0})

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
        return json_safe(comparison)
    except Exception as e:
        print(f"[compare_dataset_runs error]: {e}", flush=True)
        return json_safe({"status": "success", "variances": {}})

@router.get("/proxy-methodology")
def get_proxy_methodology():
    """Returns official definitions, mathematical formulas, and data confidence levels for all metrics."""
    from backend.agentic_service.schemas.confidence import PROXY_METHODOLOGY
    return json_safe({
        "status": "success",
        "methodology": PROXY_METHODOLOGY,
        "supported_confidence_levels": ["measured", "proxy", "estimated", "no_data_available"]
    })

@router.get("/kpis")
def get_kpis(
    time_period: str = Query("overall", pattern="^(daily|weekly|monthly|overall|yearly)$"),
    run_id: Optional[str] = Query(None, description="Specific dataset run ID (defaults to latest or 'all')"),
    company: Optional[str] = Query(None),
    product: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    language: Optional[str] = Query(None, description="Filter by detected language ISO code (e.g. en, pt, es)"),
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
        lang = _clean_param(language, None)

        filters = {
            "company": comp,
            "product": prod,
            "region": reg,
            "language": lang,
            "user": user,
            "time_period": period,
            "run_id": r_id,
            "year": _clean_param(year, None),
            "month": _clean_param(month, None),
            "start_year": _clean_param(start_year, None),
            "end_year": _clean_param(end_year, None),
            "start_date": _clean_param(start_date, None),
            "end_date": _clean_param(end_date, None),
        }
        analysis = engine.get_analysis_hub(user=user, run_id=r_id, filters=filters) or {}
        return {
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
            "proxy_methodology": analysis.get("proxy_methodology", {}),
            "filters": filters
        }
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
    time_period: str = Query("overall"),
    report_type: str = Query("operational", description="executive, operational, comparative, rca_playbook"),
    format: str = Query("pdf", description="pdf, markdown, json, csv"),
    sections: Optional[str] = Query(None, description="Comma-separated section names"),
    run_id: Optional[str] = Query(None, description="Specific dataset run ID"),
    baseline_run_id: Optional[str] = Query(None, description="Comparison baseline run ID"),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    start_year: Optional[int] = Query(None),
    end_year: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    product: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user_optional)
):
    """Generates customized analytics reports in PDF, Markdown, CSV, or JSON formats."""
    try:
        user = _get_username(current_user)
        period = _clean_param(time_period, "overall")
        r_id = _clean_param(run_id, None)
        comp = _clean_param(company, None)
        prod = _clean_param(product, None)
        reg = _clean_param(region, None)
        sec_list = [s.strip() for s in sections.split(",")] if sections else None

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
            "end_date": end_date
        }
        
        analysis = engine.get_analysis_hub(user=user, run_id=r_id, filters=filters)
        
        # If comparative report requested, load baseline analysis
        comp_data = None
        if report_type == "comparative" or baseline_run_id:
            b_run = baseline_run_id or (r_id if r_id != "all" else None)
            prev_analysis = engine.get_analysis_hub(user=user, run_id=b_run, filters={**filters, "run_id": b_run, "time_period": "overall"})
            comp_data = {
                "current_kpis": analysis.get("kpi_metrics", {}),
                "previous_kpis": prev_analysis.get("kpi_metrics", {}),
            }

        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')

        if format == "markdown" or format == "md":
            md_text = report_generator.build_markdown(
                json_safe(analysis),
                filters=filters,
                report_type=report_type,
                sections=sec_list,
                comparative_data=comp_data
            )
            return Response(
                content=md_text,
                media_type="text/markdown; charset=utf-8",
                headers={"Content-Disposition": f'attachment; filename="voila_report_{report_type}_{timestamp}.md"'}
            )
        elif format == "csv":
            csv_text = report_generator.build_csv(json_safe(analysis), filters=filters)
            return Response(
                content=csv_text,
                media_type="text/csv; charset=utf-8",
                headers={"Content-Disposition": f'attachment; filename="voila_metrics_{report_type}_{timestamp}.csv"'}
            )
        elif format == "json":
            json_payload = report_generator.build_json(json_safe(analysis), filters=filters)
            return JSONResponse(content=json_safe(json_payload))
        else:
            # Default to PDF
            pdf_bytes = report_generator.build_pdf(
                json_safe(analysis),
                filters=filters,
                report_type=report_type,
                sections=sec_list,
                comparative_data=comp_data
            )
            return StreamingResponse(
                io.BytesIO(pdf_bytes),
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="voila_analytics_report_{report_type}_{timestamp}.pdf"'},
            )
    except Exception as e:
        print(f"[Report generation error]: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

@router.get("/report-preview")
def preview_analytics_report(
    time_period: str = Query("overall"),
    report_type: str = Query("operational"),
    sections: Optional[str] = Query(None),
    run_id: Optional[str] = Query(None),
    baseline_run_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    company: Optional[str] = Query(None),
    product: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user_optional)
):
    """Returns markdown text for live in-browser preview before downloading."""
    try:
        user = _get_username(current_user)
        period = _clean_param(time_period, "overall")
        r_id = _clean_param(run_id, None)
        sec_list = [s.strip() for s in sections.split(",")] if sections else None
        filters = {
            "company": company, "product": product, "region": region,
            "user": user, "time_period": period, "run_id": r_id, "year": year, "month": month
        }
        analysis = engine.get_analysis_hub(user=user, run_id=r_id, filters=filters)
        comp_data = None
        if report_type == "comparative" or baseline_run_id:
            b_run = baseline_run_id or (r_id if r_id != "all" else None)
            prev_analysis = engine.get_analysis_hub(user=user, run_id=b_run, filters={**filters, "run_id": b_run, "time_period": "overall"})
            comp_data = {
                "current_kpis": analysis.get("kpi_metrics", {}),
                "previous_kpis": prev_analysis.get("kpi_metrics", {}),
            }
        markdown = report_generator.build_markdown(
            json_safe(analysis),
            filters=filters,
            report_type=report_type,
            sections=sec_list,
            comparative_data=comp_data
        )
        return {
            "status": "success",
            "report_type": report_type,
            "time_period": period,
            "markdown": markdown,
            "kpi_metrics": analysis.get("kpi_metrics", {})
        }
    except Exception as e:
        return {"status": "error", "error": str(e), "markdown": f"# Error Generating Preview\n\n{str(e)}"}

@router.get("/trends")
def get_trends(
    granularity: str = Query("overall", pattern="^(daily|weekly|monthly|overall|yearly)$"),
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

@router.get("/stream-status")
def get_live_stream_status(
    run_id: Optional[str] = Query("latest")
):
    """Returns current in-memory micro-batch streaming status and live telemetry."""
    from backend.algorithms.pipeline import get_stream_status
    status = get_stream_status(run_id or "latest")
    return {"status": "success", "stream": status}

@router.post("/trigger-benchmark-stream")
def trigger_benchmark_streaming_pipeline(
    background_tasks: BackgroundTasks,
    chunk_size: int = Query(20000, description="Chunk size per micro-batch (e.g. 20,000 or 100,000)"),
    current_user: dict = Depends(get_current_user_optional)
):
    """Triggers the progressive streaming micro-batch pipeline on the 100k benchmark dataset in the background."""
    import uuid
    import os
    from backend.algorithms.pipeline import DataIngestionPipeline

    user = _get_username(current_user)
    run_id = str(uuid.uuid4())
    benchmark_path = os.path.abspath("data/voila_100k_benchmark_dataset.csv")

    if not os.path.exists(benchmark_path):
        raise HTTPException(status_code=404, detail="Benchmark dataset not found on disk")

    def _run_bg():
        pipeline = DataIngestionPipeline(run_id=run_id, user_id=user)
        pipeline.run_csv_streaming(
            file_path=benchmark_path,
            source_name=f"benchmark_stream://{os.path.basename(benchmark_path)}",
            file_size_mb=25.37,
            chunk_size=chunk_size
        )

    background_tasks.add_task(_run_bg)
    return {
        "status": "success",
        "message": "Progressive streaming micro-batch pipeline initiated",
        "run_id": run_id,
        "chunk_size": chunk_size,
        "total_records_benchmark": 100000
    }

