import sys
import os
sys.path.insert(0, os.path.abspath('.'))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import asyncio
from backend.rag import rag_response
from backend.agentic_service.agent.agent import AgenticService
from backend.agentic_service.schemas.query import QueryRequest
from backend.rag.vector_search import validate_query_quality, MIN_RELEVANCE_THRESHOLD

print("=============================================")
print("TESTING RAG & AGENTIC EDGE-CASES")
print(f"Minimum Relevance Threshold: {MIN_RELEVANCE_THRESHOLD}")
print("=============================================")

agent = AgenticService()

test_cases = [
    ("Empty Query", ""),
    ("Whitespace Query", "   "),
    ("Vague Single Word: Phone", "phone"),
    ("Vague Single Word: App", "app"),
    ("Out of Domain: Cake", "How do I bake a chocolate cake?"),
    ("Out of Domain: Nonsense", "xyz123 qwerty banana spaceship"),
    ("Out of Domain: Quantum Physics", "Tell me about quantum physics and black holes"),
    ("Valid Domain Query: Update Freezing", "My phone keeps freezing after an update"),
    ("Valid Domain Query: Delivery SLA", "Why is delivery delayed and what is our response time?")
]

async def run_tests():
    for label, query in test_cases:
        print(f"\n--- CASE: {label} [Query: {query!r}] ---")
        
        # 1. Test Query Validator
        val = validate_query_quality(query)
        print(f"  • Quality Validator: status={val['status']}, is_valid={val['is_valid']}")
        if not val['is_valid']:
            print(f"    Validation Msg: {val['message']}")
        
        # 2. Test Agent Response
        req = QueryRequest(question=query)
        agent_res = agent.answer(req)
        print(f"  • Agent Answer Status: {agent_res.status} | Type: {agent_res.query_type}")
        print(f"  • Agent Answer Preview: {agent_res.answer[:140]}...")
        
        # 3. Test RAG Response
        rag_res = await rag_response(query)
        print(f"  • RAG Retrieved Count: {rag_res.get('retrieved_count', 0)}")
        print(f"  • RAG Answer Preview: {rag_res.get('answer', '')[:140]}...")

if __name__ == '__main__':
    asyncio.run(run_tests())
    print("\n=============================================")
    print("ALL EDGE CASE TESTS COMPLETED")
    print("=============================================")
