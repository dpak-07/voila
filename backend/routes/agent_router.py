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
    conversations = body.get("conversations", []) if body else []

    req = QueryRequest(
        question=question,
        company=company,
        product=product,
        region=region,
        time_period=time_period,
        conversations=conversations
    )

    user_name = current_user.get("username", "deepak") if isinstance(current_user, dict) else "deepak"
    response = agent_service.answer(req, user=user_name)
    _save_agent_conversation(user_name, question, response)

    return {
        "status": response.status,
        "query_type": response.query_type,
        "required_tools": response.required_tools,
        "answer": response.answer,
        "context": response.context,
        "validation_issues": response.validation_issues
    }

@router.post("/preview")
def preview_decision(
    request: QueryRequest,
    current_user: dict = Depends(get_current_user_optional)
):
    """Previews tool routing decisions without executing downstream tools."""
    decision = agent_service.preview_decision(request)
    return decision
