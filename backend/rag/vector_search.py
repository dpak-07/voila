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
            _EMBEDDING_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
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


class VectorSearch:
    """7-Pillar Query-Intelligent Semantic Search Engine over Qdrant collections."""

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
        return_metrics: bool = False,
    ):
        # 1. Pillars 1, 3, 4, 5, 6: Full Preprocessing & Query Intelligence
        q_info = self.qi_engine.preprocess_query(query)
        if not q_info["is_valid"]:
            empty_metrics = {
                "embedding_latency_ms": 0.0,
                "qdrant_search_latency_ms": 0.0,
                "total_retrieval_latency_ms": 0.0,
                "validation_status": q_info.get("status", "invalid"),
                "validation_message": q_info.get("error_message", "Invalid query"),
                "suggested_prompts": q_info.get("suggested_prompts", []),
            }
            return ([], empty_metrics) if return_metrics else []

        t0 = time.perf_counter()
        retrieved_raw = []

        # 2. Pillar 5: Multi-Intent Retrieval or Single Focal Retrieval
        sub_queries = q_info.get("sub_queries", [q_info["focus_query"]])
        multi_results = []

        for sub_q in sub_queries:
            sub_vec = self.model.encode(sub_q, normalize_embeddings=True).tolist()
            try:
                points = self.qdrant.query_points(
                    collection_name=collection_name,
                    query=sub_vec,
                    limit=limit,
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
                    })
                multi_results.append(sub_docs)
            except Exception as e:
                print(f"[Qdrant Retrieval Error for '{sub_q}']: {e}", flush=True)

        t1 = time.perf_counter()

        # 3. Fuse Multi-Intent results with RRF if multiple sub-queries
        if len(multi_results) > 1:
            fused_docs = reciprocal_rank_fusion(multi_results)
        elif multi_results:
            fused_docs = multi_results[0]
        else:
            fused_docs = []

        # 4. Pillar 6: Apply Negation Filtering
        excluded_terms = [t.lower() for t in q_info.get("excluded_terms", [])]
        if excluded_terms and fused_docs:
            filtered_by_negation = []
            for doc in fused_docs:
                doc_text = doc.get("text", "").lower()
                # Check if document contains any excluded term
                if not any(excl in doc_text for excl in excluded_terms):
                    filtered_by_negation.append(doc)
            fused_docs = filtered_by_negation if filtered_by_negation else fused_docs

        # 5. Pillars 2 & 7: Multi-Factor Composite Relevance & Domain Validation
        relevance_result = validate_domain_relevance_post_retrieval(
            fused_docs,
            q_info["normalized_query"],
            min_composite_threshold=0.38
        )

        final_docs = relevance_result["filtered_documents"][:limit]
        highest_score = relevance_result["max_composite_score"]
        t2 = time.perf_counter()

        metrics = {
            "embedding_latency_ms": (t1 - t0) * 1000.0,
            "qdrant_search_latency_ms": (t2 - t1) * 1000.0,
            "total_retrieval_latency_ms": (t2 - t0) * 1000.0,
            "highest_score": highest_score,
            "is_domain_relevant": relevance_result["is_domain_relevant"],
            "is_multi_intent": q_info["is_multi_intent"],
            "sub_queries": q_info["sub_queries"],
            "has_negation": q_info["has_negation"],
            "corrected_words": q_info["corrected_words"],
        }

        # If post-retrieval validation confirms out-of-domain:
        if not relevance_result["is_domain_relevant"]:
            metrics["threshold_filtered"] = True
            metrics["reason"] = f"Composite relevance {highest_score:.4f} is below noise threshold 0.38"
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