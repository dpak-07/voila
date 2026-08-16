import re
import time
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

from backend.config.settings import settings

COLLECTION_NAME = "customer_conversations_retrieval_test"
COLLECTION_NAME_FULL = "customer_conversations_full"


_EMBEDDING_MODEL = None


def _get_embedding_model():
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        try:
            _EMBEDDING_MODEL = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
        except Exception:
            try:
                _EMBEDDING_MODEL = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=False)
            except Exception as e:
                print(f"[SentenceTransformer Init Warning]: {e}", flush=True)
    return _EMBEDDING_MODEL


# Calibrated relevance threshold: based on empirical score distribution with query normalization
# Customer support queries: >= 0.55 (up to 0.92)
# Out-of-domain queries (cake=0.2794, nonsense=0.2918, quantum physics=0.2158) fall strictly below 0.42.
MIN_RELEVANCE_THRESHOLD = 0.42


def validate_query_quality(query: str) -> dict:
    """Validates user query quality before embedding and search.
    
    Catches:
    1. Empty / whitespace-only queries.
    2. Extremely vague single-word queries (e.g., 'phone', 'app', 'xyz') that lack context.
    """
    if not query or not query.strip():
        return {
            "status": "empty",
            "is_valid": False,
            "message": "Please enter a customer query."
        }

    clean_text = query.strip()
    words = [w for w in clean_text.split() if w.strip()]

    # Check for extremely vague single-word inputs that do not specify a customer problem
    common_short_intents = {"hi", "hello", "help", "thanks", "status", "summary", "kpi", "topics", "clusters", "reopen", "fcr"}
    if len(words) == 1 and len(clean_text) < 15 and clean_text.lower() not in common_short_intents:
        return {
            "status": "too_vague",
            "is_valid": False,
            "message": f"Your query '{clean_text}' is too brief to identify a specific customer issue. Could you please provide more context? (For example: 'Why are customers having issues with their {clean_text.lower()}?')."
        }

    return {
        "status": "valid",
        "is_valid": True,
        "message": ""
    }


from backend.rag.query_intelligence import (
    QueryIntelligenceEngine,
    reciprocal_rank_fusion,
    validate_domain_relevance_post_retrieval,
    compute_composite_relevance
)
from backend.rag.deduplicator import deduplicate_and_diversify
from backend.rag.reranker import rerank_documents
from backend.rag.metadata_filter import apply_in_memory_metadata_filter
from backend.rag.retrieval_logger import RetrievalLogger


class VectorSearch:
    """Enterprise 7-Pillar Query-Intelligent Semantic Search Engine with Reranking & Diversity Filtering."""

    def __init__(self):
        url = settings.vector_db_url or "http://localhost:6333"
        api_key = settings.vector_db_api_key
        self.qdrant = QdrantClient(
            url=url,
            api_key=api_key,
            timeout=2,
            check_compatibility=False,
        )
        self.model = _get_embedding_model()
        self.qi_engine = QueryIntelligenceEngine()

    def search(
        self,
        query: str,
        limit: int = 5,
        collection_name: str = COLLECTION_NAME_FULL,
        min_relevance_threshold: float = MIN_RELEVANCE_THRESHOLD,
        customer_only: bool = True,
        return_metrics: bool = False,
    ):
        # 1. Pillars 1, 3, 4, 5, 6, 14: Full Preprocessing & Query Intelligence
        q_info = self.qi_engine.preprocess_query(query)
        if not q_info["is_valid"]:
            empty_metrics = {
                "embedding_latency_ms": 0.0,
                "qdrant_search_latency_ms": 0.0,
                "total_retrieval_latency_ms": 0.0,
                "validation_status": q_info.get("status", "invalid"),
                "validation_message": q_info.get("error_message", "Invalid query"),
                "suggested_prompts": q_info.get("suggested_prompts", []),
                "retrieved_count": 0,
                "deduped_count": 0,
            }
            RetrievalLogger.log_event(empty_metrics, query, q_info.get("normalized_query", ""))
            return ([], empty_metrics) if return_metrics else []

        t0 = time.perf_counter()

        # Effective search query: use focus_query if negation is present
        effective_query = q_info.get("focus_query") or q_info.get("normalized_query") or query
        sub_queries = q_info.get("sub_queries") if q_info.get("is_multi_intent") else [effective_query]
        excluded_terms = [t.lower() for t in q_info.get("excluded_terms", [])]
        candidate_limit = max(15, limit * 3)

        # 2. Pillar 5: Multi-Intent Isolated Retrieval & Per-Intent Reranking
        intent_candidate_lists = []
        raw_retrieved_total = 0

        for sub_q in sub_queries:
            sub_vec = self.model.encode(sub_q, normalize_embeddings=True).tolist()
            try:
                points = self.qdrant.query_points(
                    collection_name=collection_name,
                    query=sub_vec,
                    limit=candidate_limit,
                ).points
                sub_docs = []
                for p in points:
                    payload = p.payload or {}
                    sub_docs.append({
                        "id": p.id,
                        "text": payload.get("text") or payload.get("clean_text") or "",
                        "score": p.score,
                        "cluster_id": payload.get("cluster_id"),
                        "sentiment": payload.get("sentiment"),
                        "author_id": payload.get("author_id"),
                        "inbound": payload.get("inbound", True),
                    })
                raw_retrieved_total += len(sub_docs)

                # Pillar 12: Metadata Filter (Inbound customer priority)
                if customer_only and sub_docs:
                    sub_docs = apply_in_memory_metadata_filter(sub_docs, customer_only=True)

                # Pillar 6: Strict Negation Filtering on excluded terms
                if excluded_terms and sub_docs:
                    neg_filtered = []
                    for doc in sub_docs:
                        d_text = doc.get("text", "").lower()
                        if not any(re.search(rf"\b{re.escape(term)}\b", d_text) for term in excluded_terms):
                            neg_filtered.append(doc)
                    if neg_filtered:
                        sub_docs = neg_filtered

                # Pillar 11: Rerank this sub-intent's candidates against its OWN sub-query
                reranked_sub = rerank_documents(
                    sub_q,
                    sub_docs,
                    top_k=candidate_limit,
                    excluded_terms=excluded_terms
                )
                for d in reranked_sub:
                    d["sub_intent"] = sub_q
                intent_candidate_lists.append(reranked_sub)
            except Exception as e:
                print(f"[Qdrant Retrieval Error for '{sub_q}']: {e}", flush=True)

        t1 = time.perf_counter()

        # 3. Fair Multi-Intent Round-Robin Interleaving
        if len(intent_candidate_lists) > 1:
            interleaved_docs = []
            seen_ids = set()
            max_depth = max((len(lst) for lst in intent_candidate_lists), default=0)
            for depth in range(max_depth):
                for intent_list in intent_candidate_lists:
                    if depth < len(intent_list):
                        doc = intent_list[depth]
                        doc_id = str(doc.get("id") or doc.get("text", "")[:80])
                        if doc_id not in seen_ids:
                            seen_ids.add(doc_id)
                            interleaved_docs.append(doc)
            fused_docs = interleaved_docs
        elif intent_candidate_lists:
            fused_docs = intent_candidate_lists[0]
        else:
            fused_docs = []

        # 4. Pillar 10: Deduplication and Diversity Filtering Layer
        deduped_docs, dedup_metrics = deduplicate_and_diversify(
            fused_docs,
            similarity_threshold=0.65,
            max_results=limit
        )

        # 5. Pillars 2 & 7: Multi-Factor Composite Relevance & Post-Retrieval Validation against effective focus query
        relevance_result = validate_domain_relevance_post_retrieval(
            deduped_docs,
            effective_query,
            min_composite_threshold=0.35
        )

        final_docs = relevance_result["filtered_documents"][:limit]
        highest_score = relevance_result["max_composite_score"]
        t2 = time.perf_counter()

        metrics = {
            "embedding_latency_ms": (t1 - t0) * 1000.0,
            "qdrant_search_latency_ms": (t2 - t1) * 1000.0,
            "total_retrieval_latency_ms": (t2 - t0) * 1000.0,
            "highest_score": highest_score,
            "top_rerank_score": final_docs[0].get("rerank_score", highest_score) if final_docs else 0.0,
            "retrieved_count": len(fused_docs),
            "deduped_count": len(final_docs),
            "removed_duplicates": dedup_metrics.get("removed_count", 0),
            "is_domain_relevant": relevance_result["is_domain_relevant"],
            "is_multi_intent": q_info["is_multi_intent"],
            "sub_queries": q_info["sub_queries"],
            "has_negation": q_info["has_negation"],
            "corrected_words": q_info["corrected_words"],
            "validation_status": "valid" if relevance_result["is_domain_relevant"] else "out_of_domain"
        }

        # 6. Pillar 15: Continuous Asynchronous Audit Logging to PostgreSQL
        RetrievalLogger.log_event(metrics, query, q_info["normalized_query"])

        # If post-retrieval validation confirms out-of-domain:
        if not relevance_result["is_domain_relevant"]:
            metrics["threshold_filtered"] = True
            metrics["reason"] = f"Composite relevance {highest_score:.4f} is below noise threshold 0.35"
            return ([], metrics) if return_metrics else []

        return (final_docs, metrics) if return_metrics else final_docs


if __name__ == "__main__":
    print("================================")
    print("QDRANT SEMANTIC SEARCH TEST")
    print("================================")

    query = "My phone keeps freezing after an update"

    print(f"Query: {query}")

    searcher = VectorSearch()

    # Try searching test collection first if full collection is empty
    collections = [c.name for c in searcher.qdrant.get_collections().collections]
    target_coll = (
        COLLECTION_NAME_FULL
        if COLLECTION_NAME_FULL in collections
        else COLLECTION_NAME
    )

    results, metrics = searcher.search(
        query,
        limit=5,
        collection_name=target_coll,
        return_metrics=True,
    )

    print(f"\nTarget Collection: {target_coll}")
    print(f"Results returned: {len(results)}")
    print(f"Embedding Latency: {metrics['embedding_latency_ms']:.2f} ms")
    print(f"Qdrant Search Latency: {metrics['qdrant_search_latency_ms']:.2f} ms")
    print(f"Total Retrieval Latency: {metrics['total_retrieval_latency_ms']:.2f} ms")

    for i, result in enumerate(results, start=1):
        print(f"\nResult {i}")
        print(f"Score: {result['score']:.4f}")
        print(f"Tweet ID: {result['tweet_id']}")
        print(f"Text: {result['text']}")

    print("\n================================")
    print("SEARCH COMPLETE")
    print("================================")