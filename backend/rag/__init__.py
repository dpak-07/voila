from typing import Any, Dict, List, Optional
from ..config.settings import settings
from ..config.db import get_mongo_collection


async def _mongo_text_search(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    coll = get_mongo_collection()
    try:
        cursor = coll.find({'$text': {'$search': query}}).limit(limit)
    except Exception:
        cursor = coll.find({'text': {'$regex': query, '$options': 'i'}}).limit(limit)

    results: List[Dict[str, Any]] = []
    async for doc in cursor:
        doc['_id'] = str(doc.get('_id'))
        results.append(doc)
    return results


def _in_memory_search(query: str, documents: List[Dict[str, Any]], limit: int = 10) -> List[Dict[str, Any]]:
    query_lower = query.lower()
    found = [doc for doc in documents if query_lower in doc.get('text', '').lower()]
    return found[:limit]


def _generate_answer(query: str, documents: List[Dict[str, Any]]) -> str:
    if not documents:
        return 'No relevant documents found for the query.'
    top_doc = documents[0]
    return f"Found {len(documents)} relevant document(s). Example text: {top_doc.get('text', '')}"


async def rag_response(query: str, documents: Optional[List[Dict[str, Any]]] = None, limit: int = 10) -> Dict[str, Any]:
    if settings.vector_db_type and settings.vector_db_type.lower() == 'mongo':
        retrieved = await _mongo_text_search(query, limit=limit)
    else:
        if documents is None:
            retrieved = []
        else:
            retrieved = _in_memory_search(query, documents, limit=limit)

    return {
        'query': query,
        'retrieved_count': len(retrieved),
        'answer': _generate_answer(query, retrieved),
        'documents': retrieved,
    }
