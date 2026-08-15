import sys
from backend.rag.vector_search import VectorSearch, COLLECTION_NAME_FULL


def query_rag(user_query: str, limit: int = 5):
    """
    Perform online semantic search for a user query against Qdrant collection.
    
    Flow:
        User Query -> Query Embedding (SentenceTransformer) -> Qdrant ANN Search -> Top-K Results
    """
    searcher = VectorSearch()

    print(f"\n==================================================")
    print(f"USER QUERY: \"{user_query}\"")
    print(f"==================================================")

    results, metrics = searcher.search(
        query=user_query,
        limit=limit,
        collection_name=COLLECTION_NAME_FULL,
        return_metrics=True,
    )

    print(f"Latency Break-down:")
    print(f"  • Query Embedding Latency: {metrics['embedding_latency_ms']:.2f} ms")
    print(f"  • Qdrant Search Latency:   {metrics['qdrant_search_latency_ms']:.2f} ms")
    print(f"  • Total Retrieval Latency: {metrics['total_retrieval_latency_ms']:.2f} ms")
    print(f"\nTop-{len(results)} Semantically Retrieved Results from Qdrant:")

    for i, res in enumerate(results, start=1):
        print(f"\n  {i}. [Score: {res['score']:.4f}] Tweet ID {res['tweet_id']}")
        print(f"     Text: \"{res['text']}\"")
        if res.get("created_at") or res.get("author_id"):
            print(f"     Payload: Author={res.get('author_id')}, Date={res.get('created_at')}")

    return results


def main():
    if len(sys.argv) > 1:
        query_text = " ".join(sys.argv[1:])
        query_rag(query_text, limit=5)
    else:
        sample_queries = [
            "My phone keeps freezing after an update",
            "My WiFi keeps disconnecting",
            "My apps are not working after an update",
            "My internet keeps dropping",
            "My payment failed on the website",
            "My delivery has not arrived",
        ]
        for q in sample_queries:
            query_rag(q, limit=5)


if __name__ == "__main__":
    main()
