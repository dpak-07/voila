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
    """Answers questions with grounded database context and real customer conversation evidence."""
    # Fast database-grounded RAG search
    result = await rag_response(q)
    return {
        "query": q,
        "status": "success",
        "answer": result.get("answer", ""),
        "retrieved_count": result.get("retrieved_count", 0),
        "results": result.get("documents", []),
        "context": {
            "customer_context": [d.get("text") for d in result.get("documents", []) if d.get("text")]
        }
    }
