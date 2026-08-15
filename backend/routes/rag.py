from fastapi import APIRouter, Depends, Query
from backend.auth.dependencies import get_current_user_optional
from backend.agentic_service.agent.agent import AgenticService
from backend.agentic_service.schemas.query import QueryRequest
from backend.rag import rag_response

router = APIRouter(
    prefix="/rag",
    tags=["rag"]
)

agent_service = AgenticService()

@router.get("/query")
@router.post("/query")
async def rag_query(
    q: str = Query(...),
    current_user: dict = Depends(get_current_user_optional)
):
    """Answers questions using the AgenticService reasoning engine with grounded database context."""
    try:
        req = QueryRequest(question=q)
        user_name = current_user.get("username", "deepak") if isinstance(current_user, dict) else "deepak"
        agent_resp = agent_service.answer(req, user=user_name)
        if agent_resp and agent_resp.status == "success" and agent_resp.answer:
            return {
                "query": q,
                "status": "success",
                "required_tools": agent_resp.required_tools,
                "answer": agent_resp.answer,
                "context": agent_resp.context
            }
    except Exception as e:
        print(f"AgenticService execution warning: {e}")

    # Fallback to direct RAG search
    result = await rag_response(q)
    return result
