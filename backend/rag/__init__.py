from typing import Any, Dict, List


def retrieve_documents(query: str, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    query_lower = query.lower()
    return [doc for doc in documents if query_lower in doc.get('text', '').lower()]


def generate_answer(query: str, documents: List[Dict[str, Any]]) -> str:
    if not documents:
        return 'No relevant documents found for the query.'
    top_doc = documents[0]
    return f"Found {len(documents)} relevant document(s). Example text: {top_doc.get('text', '')}"


def rag_response(query: str, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
    retrieved = retrieve_documents(query, documents)
    return {
        'query': query,
        'retrieved_count': len(retrieved),
        'answer': generate_answer(query, retrieved),
        'documents': retrieved,
    }
