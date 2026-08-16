import sys
import os
sys.path.insert(0, os.path.abspath('.'))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import asyncio
from backend.rag.query_intelligence import QueryIntelligenceEngine
from backend.rag.vector_search import VectorSearch
from backend.agentic_service.agent.agent import AgenticService
from backend.agentic_service.schemas.query import QueryRequest

print("================================================================================")
print("7-PILLAR RAG & AGENT QUERY INTELLIGENCE VERIFICATION TEST SUITE")
print("================================================================================")

qi = QueryIntelligenceEngine()
searcher = VectorSearch()
agent = AgenticService()

# ------------------------------------------------------------------------------
# TEST PILLAR 1: TYPOS & SPELLING NORMALIZATION
# ------------------------------------------------------------------------------
print("\n[PILLAR 1] Problem 1 — Typos (Query Normalization & Spell Correction):")
q1 = "my phne keeps frezing after updte"
p1_res = qi.preprocess_query(q1)
print(f"  • Input:       '{q1}'")
print(f"  • Normalized:  '{p1_res['normalized_query']}'")
print(f"  • Corrections: {p1_res['corrected_words']}")
assert p1_res['normalized_query'] == "my phone keeps freezing after update", "Pillar 1 Failed!"
print("  ✅ Pillar 1 Passed: Typos corrected accurately before embedding.")

# ------------------------------------------------------------------------------
# TEST PILLAR 2: OUT-OF-DOMAIN VALIDATION & STEER-BACK
# ------------------------------------------------------------------------------
print("\n[PILLAR 2] Problem 2 — Out-of-Domain (Relevance / Domain Validation):")
q2 = "How do I bake a chocolate cake?"
p2_docs, p2_metrics = searcher.search(q2, return_metrics=True)
print(f"  • Input:                '{q2}'")
print(f"  • Retrieved Docs:       {len(p2_docs)}")
print(f"  • Composite Score:      {p2_metrics.get('highest_score', 0.0):.4f}")
print(f"  • Is Domain Relevant:   {p2_metrics.get('is_domain_relevant', False)}")
assert not p2_metrics.get('is_domain_relevant', True), "Pillar 2 Failed!"
print("  ✅ Pillar 2 Passed: Out-of-domain query safely filtered by post-retrieval validation.")

# ------------------------------------------------------------------------------
# TEST PILLAR 3: GIBBERISH INPUT VALIDATION BEFORE EMBEDDING
# ------------------------------------------------------------------------------
print("\n[PILLAR 3] Problem 3 — Gibberish (Input Validation Before Embedding):")
q3 = "xyz123 qwerty asdfghjkl"
p3_res = qi.preprocess_query(q3)
print(f"  • Input:         '{q3}'")
print(f"  • Is Valid:      {p3_res['is_valid']}")
print(f"  • Status:        {p3_res['status']}")
print(f"  • Error Message: {p3_res['error_message']}")
assert not p3_res['is_valid'] and p3_res['status'] == "gibberish", "Pillar 3 Failed!"
print("  ✅ Pillar 3 Passed: Gibberish caught immediately before generating embeddings.")

# ------------------------------------------------------------------------------
# TEST PILLAR 4: GENERIC QUERIES (SPECIFICITY CHECK)
# ------------------------------------------------------------------------------
print("\n[PILLAR 4] Problem 4 — Generic Queries (Query Specificity Check):")
q4 = "phone"
p4_res = qi.preprocess_query(q4)
print(f"  • Input:              '{q4}'")
print(f"  • Is Valid:           {p4_res['is_valid']}")
print(f"  • Status:             {p4_res['status']}")
print(f"  • Clarification Msg:  {p4_res['error_message']}")
print(f"  • Suggested Prompts:  {p4_res['suggested_prompts']}")
assert not p4_res['is_valid'] and p4_res['status'] == "too_generic", "Pillar 4 Failed!"
print("  ✅ Pillar 4 Passed: Vague one-word query flagged with interactive suggestions.")

# ------------------------------------------------------------------------------
# TEST PILLAR 5: MULTI-INTENT SPLITTING & RRF RERANKING
# ------------------------------------------------------------------------------
print("\n[PILLAR 5] Problem 5 — Multi-Intent (Decomposition -> Parallel -> RRF):")
q5 = "Why are deliveries delayed AND what is our average response time?"
p5_res = qi.preprocess_query(q5)
print(f"  • Input:           '{q5}'")
print(f"  • Is Multi-Intent: {p5_res['is_multi_intent']}")
print(f"  • Sub-Queries:     {p5_res['sub_queries']}")
p5_docs, p5_metrics = searcher.search(q5, return_metrics=True)
print(f"  • Fused RRF Docs:  {len(p5_docs)} documents returned across sub-intents")
assert p5_res['is_multi_intent'] and len(p5_res['sub_queries']) == 2, "Pillar 5 Failed!"
print("  ✅ Pillar 5 Passed: Multi-intent query decomposed and retrieved with RRF fusion.")

# ------------------------------------------------------------------------------
# TEST PILLAR 6: NEGATION & FOCUS EXTRACTION
# ------------------------------------------------------------------------------
print("\n[PILLAR 6] Problem 6 — Negation (Extract Focus Before Embedding):")
q6 = "customers who are not having login issues but have delivery delays"
p6_res = qi.preprocess_query(q6)
print(f"  • Input:          '{q6}'")
print(f"  • Has Negation:   {p6_res['has_negation']}")
print(f"  • Positive Focus: '{p6_res['focus_query']}'")
print(f"  • Excluded Terms: {p6_res['excluded_terms']}")
assert "delivery" in p6_res['focus_query'] and "login" in p6_res['excluded_terms'], "Pillar 6 Failed!"
print("  ✅ Pillar 6 Passed: Negation extracted positive issue target and filtered negative constraint.")

# ------------------------------------------------------------------------------
# TEST PILLAR 7: MULTI-FACTOR COMPOSITE RELEVANCE SCORING
# ------------------------------------------------------------------------------
print("\n[PILLAR 7] Problem 7 — Similarity Threshold as Multi-Signal System:")
q7 = "disappointed with iphone freezing after update"
p7_docs, p7_metrics = searcher.search(q7, return_metrics=True)
print(f"  • Input:            '{q7}'")
print(f"  • Max Composite:    {p7_metrics.get('highest_score', 0.0):.4f}")
print(f"  • In-Domain Status: {p7_metrics.get('is_domain_relevant', False)}")
print(f"  • Top Document:     {p7_docs[0]['text'][:80]!r} (score: {p7_docs[0].get('composite_score', p7_docs[0]['score']):.4f})")
assert p7_metrics.get('is_domain_relevant', False), "Pillar 7 Failed!"
print("  ✅ Pillar 7 Passed: Composite scoring blends vector, lexical, and cluster signals.")

print("\n================================================================================")
print("ALL 7 PILLARS OF QUERY INTELLIGENCE & RETRIEVAL FULLY VERIFIED AND PASSING!")
print("================================================================================")
