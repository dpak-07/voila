from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, Body
from backend.auth.dependencies import get_current_user_optional
from backend.rag import rag_response

router = APIRouter(
    prefix="/rag",
    tags=["rag"]
)

@router.get("/query")
@router.post("/query")
async def rag_query(
    q: Optional[str] = Query(None),
    body: Optional[Dict[str, Any]] = Body(None),
    current_user: dict = Depends(get_current_user_optional)
):
    """Answers questions with grounded database context and real customer conversation evidence."""
    query_text = q or (body.get("q") if body else None) or (body.get("query") if body else None) or (body.get("question") if body else None)
    
    if not query_text or not str(query_text).strip():
        return {
            "query": "",
            "status": "empty_input",
            "answer": "Please provide a customer query or issue description.",
            "retrieved_count": 0,
            "results": [],
            "context": {
                "customer_context": []
            }
        }

    clean_q = str(query_text).strip()
    result = await rag_response(clean_q)
    return {
        "query": clean_q,
        "status": result.get("status", "success"),
        "answer": result.get("answer", ""),
        "retrieved_count": result.get("retrieved_count", 0),
        "results": result.get("documents", []),
        "context": {
            "customer_context": [d.get("text") for d in result.get("documents", []) if d.get("text")]
        }
    }
