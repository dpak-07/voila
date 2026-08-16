from fastapi import APIRouter, Depends, Query, Body
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from backend.config.settings import settings
from backend.config.db import execute_query
from backend.auth.dependencies import get_current_user_optional
from backend.agentic_service.agent.agent import AgenticService
from backend.agentic_service.schemas.query import QueryRequest

router = APIRouter(
    prefix="/agent",
    tags=["agentic_service"]
)

agent_service = AgenticService()

def _save_agent_conversation(user: str, question: str, response: Any):
    try:
        tools = list(getattr(response, "required_tools", []) or [])
        sql = """
        INSERT INTO agent_conversations (timestamp, user_id, question, query_type, answer, status)
        VALUES (CURRENT_TIMESTAMP, %s, %s, %s, %s, %s)
        RETURNING id;
        """
        row = execute_query(
            sql,
            (
                user,
                question,
                getattr(response, "query_type", "general"),
                getattr(response, "answer", ""),
                getattr(response, "status", "success")
            ),
            fetch_one=True,
            commit=True
        )
        conv_id = row.get("id") if row else None
        for tool in tools:
            execute_query(
                "INSERT INTO agent_tools (agent_conversation_id, tool_name) VALUES (%s, %s);",
                (conv_id, str(tool)),
                commit=True,
            )
    except Exception as e:
        print(f"[Agent Log DB Warning]: {e}", flush=True)

@router.post("/query")
@router.get("/query")
def agent_query(
    q: Optional[str] = Query(None),
    body: Optional[Dict[str, Any]] = Body(None),
    current_user: dict = Depends(get_current_user_optional)
):
    """Executes the complete Agentic AI reasoning loop (Validator -> Decision Engine -> Tool Execution -> Validator -> LLM Context)."""
    question = q or (body.get("question") if body else None) or (body.get("q") if body else None)
    if not question:
        question = "Give me an executive dashboard overview of customer complaints and KPIs."

    company = body.get("company") if body else None
    product = body.get("product") if body else None
    region = body.get("region") if body else None
    time_period = body.get("time_period") if body else None
    run_id = body.get("run_id") if body else None
    conversations = body.get("conversations", []) if body else []

    req = QueryRequest(
        question=question,
        run_id=run_id,
        company=company,
        product=product,
        region=region,
        time_period=time_period,
        conversations=conversations
    )

    user_name = current_user.get("username", "deepak") if isinstance(current_user, dict) else "deepak"
    service = AgenticService()
    response = service.answer(req, user=user_name)
    _save_agent_conversation(user_name, question, response)

    return {
        "status": response.status,
        "query_type": response.query_type,
        "required_tools": response.required_tools,
        "answer": response.answer,
        "context": response.context,
        "validation_issues": [v.model_dump() if hasattr(v, "model_dump") else v for v in response.validation_issues],
        "data_confidence": response.data_confidence.value if response.data_confidence else "measured",
    }

@router.post("/chat")
def agent_chat(
    body: Optional[Dict[str, Any]] = Body(None),
    current_user: dict = Depends(get_current_user_optional)
):
    """Chat endpoint powering the continuous Voice-of-Customer conversational copilot."""
    body = body or {}
    message = body.get("message") or body.get("question") or body.get("text") or "Analyze customer complaint clusters"
    run_id = body.get("run_id")
    conv_id = body.get("conversation_id")

    req = QueryRequest(
        question=message,
        run_id=run_id,
        company=body.get("company"),
        product=body.get("product"),
        region=body.get("region"),
        time_period=body.get("time_period"),
    )

    user_name = current_user.get("username", "deepak") if isinstance(current_user, dict) else "deepak"
    service = AgenticService()
    response = service.answer(req, user=user_name)
    _save_agent_conversation(user_name, message, response)

    ctx = response.context if isinstance(response.context, dict) else {}
    kpis = ctx.get("kpi_metrics") or ctx.get("kpis") or {}

    return {
        "status": response.status,
        "reply": response.answer,
        "answer": response.answer,
        "query_type": response.query_type,
        "context": ctx,
        "citations": ctx.get("sample_conversations") or [],
        "kpi_snapshot": {
            "resolution_rate": f"{kpis.get('resolution_rate', 15.0):.1f}%",
            "reopen_rate": f"{kpis.get('reopen_rate', 46.8):.1f}%",
            "avg_response_time": f"{kpis.get('avg_response_time_minutes', 56.2):.1f}m"
        } if kpis else None,
        "conversation_id": conv_id or f"conv_{int(datetime.now(timezone.utc).timestamp())}"
    }

@router.get("/conversations")
def get_conversations(
    limit: int = 50,
    current_user: dict = Depends(get_current_user_optional)
):
    """Retrieves previous agentic AI query history from PostgreSQL."""
    try:
        user_name = current_user.get("username", "deepak") if isinstance(current_user, dict) else "deepak"
        rows = execute_query(
            """
            SELECT id, timestamp, user_id, question, query_type, answer, status
            FROM agent_conversations
            WHERE user_id = %s OR user_id = 'deepak'
            ORDER BY timestamp DESC
            LIMIT %s;
            """,
            (user_name, limit),
            fetch_all=True
        ) or []
        for r in rows:
            if isinstance(r.get("timestamp"), (datetime,)):
                r["timestamp"] = r["timestamp"].isoformat()
        return rows
    except Exception as e:
        print(f"[Fetch Agent Conversations Error]: {e}", flush=True)
        return []

@router.delete("/conversations/{conv_id}")
def delete_conversation(
    conv_id: int,
    current_user: dict = Depends(get_current_user_optional)
):
    """Deletes a specific agent conversation record and its tool audit logs."""
    try:
        execute_query("DELETE FROM agent_tools WHERE agent_conversation_id = %s;", (conv_id,), commit=True)
        execute_query("DELETE FROM agent_conversations WHERE id = %s;", (conv_id,), commit=True)
        return {"status": "success", "message": f"Conversation {conv_id} deleted."}
    except Exception as e:
        print(f"[Delete Agent Conversation Error]: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/conversations")
def clear_all_conversations(
    current_user: dict = Depends(get_current_user_optional)
):
    """Clears all agent conversation audit logs."""
    try:
        user_name = current_user.get("username", "deepak") if isinstance(current_user, dict) else "deepak"
        execute_query("DELETE FROM agent_tools WHERE agent_conversation_id IN (SELECT id FROM agent_conversations WHERE user_id = %s OR user_id = 'deepak');", (user_name,), commit=True)
        execute_query("DELETE FROM agent_conversations WHERE user_id = %s OR user_id = 'deepak';", (user_name,), commit=True)
        return {"status": "success", "message": "All conversations cleared."}
    except Exception as e:
        print(f"[Clear Agent Conversations Error]: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/preview")
def preview_decision(
    request: QueryRequest,
    current_user: dict = Depends(get_current_user_optional)
):
    """Previews tool routing decisions without executing downstream tools."""
    decision = agent_service.preview_decision(request)
    return decision
