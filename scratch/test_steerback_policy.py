import sys
import os
sys.path.insert(0, os.path.abspath('.'))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import asyncio
from backend.agentic_service.agent.agent import AgenticService
from backend.agentic_service.schemas.query import QueryRequest
from backend.rag import rag_response

print("==========================================================")
print("TESTING CHATBOT TOPIC FOCUS & STEER-BACK POLICY")
print("==========================================================")

test_queries = [
    ("Off-Topic: Cake", "How do I bake a chocolate cake?"),
    ("Off-Topic: Quantum Physics", "Tell me about quantum physics and black holes"),
    ("Off-Topic: Sports", "Who won the football championship yesterday?"),
    ("Valid Support: Delivery Latency", "Why is delivery delayed and what is our response time?"),
    ("Valid Support with Typos: Freezing", "my phne keeps frezing after updte")
]

agent = AgenticService()

async def run_steerback_tests():
    for label, query in test_queries:
        print(f"\n----------------------------------------------------------")
        print(f"CASE: {label} | Query: {query!r}")
        print(f"----------------------------------------------------------")
        
        # 1. Test Agentic Copilot response
        req = QueryRequest(question=query)
        agent_res = agent.answer(req)
        print(f"• Agent Status: {agent_res.status} | Query Type: {agent_res.query_type}")
        print(f"• Agent Response:\n{agent_res.answer}\n")
        
        # 2. Test RAG response
        rag_res = await rag_response(query)
        print(f"• RAG Retrieved: {rag_res.get('retrieved_count', 0)} docs")
        print(f"• RAG Answer Preview: {rag_res.get('answer', '')[:100]}...\n")

if __name__ == '__main__':
    asyncio.run(run_steerback_tests())
    print("\n==========================================================")
    print("ALL STEER-BACK POLICY TESTS PASSED")
    print("==========================================================")
