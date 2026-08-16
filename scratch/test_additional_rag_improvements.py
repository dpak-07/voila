import sys
import os
sys.path.insert(0, os.path.abspath('.'))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import asyncio
from backend.rag.deduplicator import deduplicate_and_diversify
from backend.rag.reranker import rerank_documents, score_specificity
from backend.rag.metadata_filter import apply_in_memory_metadata_filter
from backend.rag.chunking import IssueBasedChunker
from backend.rag.query_intelligence import QueryIntelligenceEngine
from backend.rag.vector_search import VectorSearch
from backend.rag.retrieval_logger import RetrievalLogger

print("================================================================================")
print("TESTING 6 ADDITIONAL RAG IMPROVEMENT FINDINGS (10 to 15)")
print("================================================================================")

searcher = VectorSearch()
qi = QueryIntelligenceEngine()

# ------------------------------------------------------------------------------
# TEST 10: DUPLICATE / NEAR-DUPLICATE SUPPRESSION
# ------------------------------------------------------------------------------
print("\n[FINDING 10] Problem 10 — Duplicate / Near-Duplicate Retrieval:")
duplicate_candidates = [
    {"id": 1, "text": "i can not access my account", "score": 0.85},
    {"id": 2, "text": "i cant access my account", "score": 0.84},
    {"id": 3, "text": "i can't even access my account", "score": 0.83},
    {"id": 4, "text": "cant access my account", "score": 0.82},
    {"id": 5, "text": "my account password reset link is broken and expired", "score": 0.80},
    {"id": 6, "text": "facing 2FA authentication code error when logging in", "score": 0.78}
]

deduped, dedup_meta = deduplicate_and_diversify(duplicate_candidates, similarity_threshold=0.60, max_results=3)
print(f"  • Raw Input Candidates:     {len(duplicate_candidates)}")
print(f"  • Deduped Diverse Results:  {len(deduped)}")
print(f"  • Duplicates Filtered Out:  {dedup_meta['removed_count']}")
for idx, d in enumerate(deduped, 1):
    print(f"    {idx}. {d['text']!r}")

assert len(deduped) <= 3 and dedup_meta['removed_count'] >= 3, "Finding 10 Deduplication Failed!"
print("  ✅ Finding 10 Passed: Near-duplicates suppressed, diverse contextual examples retained.")

# ------------------------------------------------------------------------------
# TEST 11: RETRIEVAL RERANKING IMPROVEMENT
# ------------------------------------------------------------------------------
print("\n[FINDING 11] Problem 11 — Retrieval Reranking Improvement:")
rerank_candidates = [
    {"id": 101, "text": "issue", "score": 0.90, "inbound": True}, # High raw cosine, but zero diagnostic value
    {"id": 102, "text": "my iphone 6 keeps freezing and crashes after the ios 11 update", "score": 0.75, "inbound": True}, # Lower cosine, but rich specific diagnostic
    {"id": 103, "text": "@customer please send us a DM with your account number to help", "score": 0.85, "inbound": False} # High cosine, but canned agent reply
]

reranked = rerank_documents("phone freezing update", rerank_candidates, top_k=3)
print(f"  • Candidate Rankings After Multi-Factor Reranker:")
for idx, d in enumerate(reranked, 1):
    print(f"    {idx}. [Score: {d['rerank_score']:.4f} | Spec: {d['specificity_score']:.2f} | Meta: {d['metadata_score']:.2f}] -> {d['text']!r}")

assert reranked[0]["id"] == 102, "Finding 11 Reranking Failed!"
print("  ✅ Finding 11 Passed: Diagnostic customer complaint promoted to #1; generic 'issue' and canned agent replies demoted.")

# ------------------------------------------------------------------------------
# TEST 12: METADATA FILTERING
# ------------------------------------------------------------------------------
print("\n[FINDING 12] Problem 12 — Metadata Filtering (Inbound Customer vs Agent Outbound):")
mixed_corpus = [
    {"id": 201, "text": "delivery is delayed for 5 days and package tracking is stuck", "inbound": True, "author_id": "cust_992"},
    {"id": 202, "text": "Hello @cust_992 please DM us your order ID so we can check courier status", "inbound": False, "author_id": "AmazonHelp"},
    {"id": 203, "text": "courier delivered damaged package to wrong address", "inbound": True, "author_id": "cust_104"}
]

customer_only_results = apply_in_memory_metadata_filter(mixed_corpus, customer_only=True)
print(f"  • Mixed Corpus Size:       {len(mixed_corpus)}")
print(f"  • Filtered Customer Only:  {len(customer_only_results)}")
for idx, d in enumerate(customer_only_results, 1):
    print(f"    {idx}. [Author: {d['author_id']} | Inbound: {d['inbound']}] -> {d['text']!r}")

assert len(customer_only_results) == 2 and all(d["inbound"] is True for d in customer_only_results), "Finding 12 Failed!"
print("  ✅ Finding 12 Passed: Agent outbound response excluded; genuine customer complaints preserved.")

# ------------------------------------------------------------------------------
# TEST 13: CHUNKING STRATEGY VALIDATION
# ------------------------------------------------------------------------------
print("\n[FINDING 13] Problem 13 — Issue-Based Chunking Strategy:")
sample_long_conversation = {
    "id": "thread_8842",
    "turns": [
        {"role": "customer", "inbound": True, "author_id": "cust_1", "text": "my app keeps crashing whenever i try to open the payment page."},
        {"role": "agent", "inbound": False, "author_id": "support_agent", "text": "Hello! Have you tried restarting your phone and reinstalling the app?"},
        {"role": "customer", "inbound": True, "author_id": "cust_1", "text": "yes i reinstalled twice on iOS 17.2, still gets error ERR_PAYMENT_TIMEOUT."},
        {"role": "agent", "inbound": False, "author_id": "support_agent", "text": "Thank you for the error code. We have escalated this to engineering."}
    ]
}

chunker = IssueBasedChunker()
chunks = chunker.chunk_conversation(sample_long_conversation)
print(f"  • Original Multi-Turn Thread: {len(sample_long_conversation['turns'])} turns")
print(f"  • Generated Issue Chunks:     {len(chunks)} chunks")
for idx, ch in enumerate(chunks, 1):
    print(f"    Chunk {idx} [{ch['chunk_type']}]: {ch['text'][:90]}...")

assert len(chunks) >= 2 and any(ch["chunk_type"] == "problem_declaration" for ch in chunks), "Finding 13 Failed!"
print("  ✅ Finding 13 Passed: Problem declaration extracted separately from dialogue turns.")

# ------------------------------------------------------------------------------
# TEST 14: EMPTY / LOW-QUALITY QUERY HANDLING
# ------------------------------------------------------------------------------
print("\n[FINDING 14] Problem 14 — Empty / Low-Quality Query Handling:")
low_quality_queries = ["", "?", "...", "hi", "help"]

for lq in low_quality_queries:
    res = qi.preprocess_query(lq)
    print(f"  • Query: {lq!r:<6} -> Valid: {res['is_valid']:<5} | Status: {res['status']:<12} | Message: {res['error_message']}")
    assert not res['is_valid'], f"Finding 14 Failed on {lq}!"

print("  ✅ Finding 14 Passed: Low-quality/empty queries intercepted before embedding with user guidance.")

# ------------------------------------------------------------------------------
# TEST 15: RETRIEVAL MONITORING & AUDIT LOGGING
# ------------------------------------------------------------------------------
print("\n[FINDING 15] Problem 15 — Retrieval Monitoring & Continuous Evaluation:")
# Execute a real end-to-end retrieval which logs telemetry to PostgreSQL
docs, metrics = searcher.search("Why are deliveries delayed?", limit=3, return_metrics=True)
print(f"  • Search Completed: Retieved {len(docs)} docs | Deduped: {metrics.get('deduped_count', 0)} | Total Latency: {metrics.get('total_retrieval_latency_ms', 0):.2f}ms")

# Allow async logging thread 0.5s to write
import time
time.sleep(0.5)

eval_summary = RetrievalLogger.get_eval_summary()
print(f"  • PostgreSQL Telemetry Database Summary:")
print(f"    - Total Logged Queries:     {eval_summary.get('total_queries', 0)}")
print(f"    - Avg Total Latency:        {eval_summary.get('avg_latency_ms', 0.0):.2f} ms")
print(f"    - Avg Top Similarity:       {eval_summary.get('avg_top_similarity', 0.0):.4f}")
print(f"    - Domain Relevance Rate:    {eval_summary.get('domain_relevance_rate', 100.0):.1f}%")

assert eval_summary.get("total_queries", 0) > 0, "Finding 15 Logging Failed!"
print("  ✅ Finding 15 Passed: Retrieval telemetry logged to PostgreSQL for continuous evaluation.")

print("\n================================================================================")
print("ALL 6 ADDITIONAL RAG IMPROVEMENT FINDINGS (10 to 15) FULLY VERIFIED & PASSING!")
print("================================================================================")
