import os
import sys

from backend.rag.vector_ingestion import VectorIngestion, COLLECTION_NAME_FULL
from backend.rag.vector_search import VectorSearch


def run_test():
    print("==================================================")
    print("STEP 1: RUNNING SMALL INGESTION TEST (max_records=1000)")
    print("==================================================")

    ingestion = VectorIngestion()

    # Create full collection
    ingestion.create_full_collection(COLLECTION_NAME_FULL)

    total_proc, total_up = ingestion.ingest_full_dataset(
        batch_size=1000,
        max_records=1000,
        collection_name=COLLECTION_NAME_FULL,
    )

    print("\n==================================================")
    print("STEP 2: VERIFYING QDRANT COLLECTION")
    print("==================================================")
    ingestion.verify_full(COLLECTION_NAME_FULL)

    print("\n==================================================")
    print("STEP 3: TESTING SEMANTIC TOP-K RETRIEVAL & LATENCY")
    print("==================================================")

    searcher = VectorSearch()

    test_queries = [
        "My phone keeps freezing after an update",
        "My WiFi keeps disconnecting",
        "My apps are not working after an update",
        "My internet keeps dropping",
        "How do I track my delivery or package status?",
    ]

    for q_idx, query in enumerate(test_queries, start=1):
        print(f"\n--------------------------------------------------")
        print(f"QUERY {q_idx}: \"{query}\"")
        print(f"--------------------------------------------------")

        results, metrics = searcher.search(
            query=query,
            limit=5,
            collection_name=COLLECTION_NAME_FULL,
            return_metrics=True,
        )

        print(f"Latency Break-down:")
        print(f"  • Query Embedding Latency: {metrics['embedding_latency_ms']:.2f} ms")
        print(f"  • Qdrant Search Latency:   {metrics['qdrant_search_latency_ms']:.2f} ms")
        print(f"  • Total Retrieval Latency: {metrics['total_retrieval_latency_ms']:.2f} ms")
        print(f"\nTop-{len(results)} Semantically Retrieved Results:")

        for i, res in enumerate(results, start=1):
            print(f"  {i}. [Score: {res['score']:.4f}] Tweet ID {res['tweet_id']}: \"{res['text']}\"")

    print("\n==================================================")
    print("SMALL 1,000-RECORD TEST COMPLETED SUCCESSFULLY")
    print("==================================================")


if __name__ == "__main__":
    run_test()
