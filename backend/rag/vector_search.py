import time
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

from backend.config.settings import settings

COLLECTION_NAME = "customer_conversations_retrieval_test"
COLLECTION_NAME_FULL = "customer_conversations_full"


class VectorSearch:
    """Semantic search over Qdrant conversation collections."""

    def __init__(self):
        url = settings.vector_db_url or "http://localhost:6333"
        api_key = settings.vector_db_api_key
        self.qdrant = QdrantClient(
            url=url,
            api_key=api_key,
            timeout=10,
        )

        self.model = SentenceTransformer(
            "all-MiniLM-L6-v2"
        )


    def search(
        self,
        query: str,
        limit: int = 5,
        collection_name: str = COLLECTION_NAME_FULL,
        return_metrics: bool = False,
    ):
        if not query or not query.strip():
            empty_metrics = {
                "embedding_latency_ms": 0.0,
                "qdrant_search_latency_ms": 0.0,
                "total_retrieval_latency_ms": 0.0,
            }
            return ([], empty_metrics) if return_metrics else []

        t0 = time.perf_counter()

        query_vector = self.model.encode(
            query,
            normalize_embeddings=True,
        ).tolist()

        t1 = time.perf_counter()

        try:
            results = self.qdrant.query_points(
                collection_name=collection_name,
                query=query_vector,
                limit=limit,
            ).points
        except Exception as e:
            print(f"[Qdrant Search Error on '{collection_name}']: {e}", flush=True)
            empty_metrics = {
                "embedding_latency_ms": (t1 - t0) * 1000.0,
                "qdrant_search_latency_ms": 0.0,
                "total_retrieval_latency_ms": (time.perf_counter() - t0) * 1000.0,
            }
            return ([], empty_metrics) if return_metrics else []

        t2 = time.perf_counter()

        embedding_latency_ms = (t1 - t0) * 1000.0
        qdrant_search_latency_ms = (t2 - t1) * 1000.0
        total_retrieval_latency_ms = (t2 - t0) * 1000.0

        metrics = {
            "embedding_latency_ms": embedding_latency_ms,
            "qdrant_search_latency_ms": qdrant_search_latency_ms,
            "total_retrieval_latency_ms": total_retrieval_latency_ms,
        }

        retrieved = []

        for result in results:
            payload = result.payload or {}

            retrieved.append(
                {
                    "score": result.score,
                    "tweet_id": payload.get("tweet_id"),
                    "text": payload.get("text"),
                    "author_id": payload.get("author_id"),
                    "inbound": payload.get("inbound"),
                    "created_at": payload.get("created_at"),
                    "response_tweet_id": payload.get("response_tweet_id"),
                    "in_response_to_tweet_id": payload.get("in_response_to_tweet_id"),
                }
            )

        if return_metrics:
            return retrieved, metrics
        return retrieved


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