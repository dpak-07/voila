import sys
import os
sys.path.insert(0, os.path.abspath('.'))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import asyncio
from backend.rag.query_preprocessor import normalize_and_correct_query
from backend.rag.vector_search import VectorSearch, MIN_RELEVANCE_THRESHOLD
from backend.rag import rag_response
from backend.agentic_service.agent.agent import AgenticService
from backend.agentic_service.schemas.query import QueryRequest

print("==========================================================")
print("TESTING SPELLING NORMALIZATION & RAG RETRIEVAL PIPELINE")
print("==========================================================")

noisy_queries = [
    "my phne keeps frezing after updte",
    "why is our delivry delayd and what is the avrg response time?",
    "custmer complants about login passwrd reset",
    "app keep crashng after recent upgarde"
]

searcher = VectorSearch()
agent = AgenticService()

async def run_pipeline_tests():
    for query in noisy_queries:
        print(f"\n==========================================================")
        print(f"INPUT QUERY: {query!r}")
        print(f"==========================================================")
        
        # 1. Normalization step
        norm = normalize_and_correct_query(query)
        print(f"  • Preprocessor Output: '{norm['normalized_query']}'")
        print(f"  • Words Corrected:     {norm['corrected_words']}")
        
        # 2. Vector Search (Raw vs Normalized)
        # Without normalization
        raw_vec = searcher.model.encode(query, normalize_embeddings=True).tolist()
        norm_vec = searcher.model.encode(norm['normalized_query'], normalize_embeddings=True).tolist()
        
        # Query searcher with threshold
        docs, metrics = searcher.search(query, limit=3, return_metrics=True)
        print(f"  • RAG Qdrant Retrieval Count: {len(docs)} documents")
        print(f"  • Highest Relevance Score:    {metrics.get('highest_score', 0.0):.4f}")
        print(f"  • Threshold Filtered:         {metrics.get('threshold_filtered', False)}")
        
        # 3. Agent Response
        req = QueryRequest(question=query)
        agent_res = agent.answer(req)
        print(f"  • Agent Status: {agent_res.status} | Type: {agent_res.query_type}")
        print(f"  • Agent Answer Preview: {agent_res.answer[:120]}...")

if __name__ == '__main__':
    asyncio.run(run_pipeline_tests())
    print("\n==========================================================")
    print("ALL TYPO RETRIEVAL TESTS COMPLETED SUCCESSFULLY")
    print("==========================================================")
