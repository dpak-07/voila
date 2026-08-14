from fastapi import APIRouter, Depends, Query, Body
from datetime import datetime
from typing import Optional, List, Dict, Any
from pymongo import MongoClient
from backend.config.settings import settings
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
        client = MongoClient(settings.mongo_uri)
        db = client[settings.mongo_db]
        doc = {
            "timestamp": datetime.utcnow().isoformat(),
            "user": user,
            "question": question,
            "query_type": getattr(response, "query_type", "general"),
            "required_tools": getattr(response, "required_tools", []),
            "answer": getattr(response, "answer", ""),
            "status": getattr(response, "status", "success")
        }
        db["agent_conversations"].insert_one(doc)
    except Exception as e:
        print(f"Error saving agent conversation: {e}")

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

    response = agent_service.answer(req)
    
    # Save conversation session to MongoDB
    user_name = current_user.get("username", "deepak") if current_user else "deepak"
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
