import os
import sys
import time
import uuid
import pandas as pd

# Ensure repo root is in python path
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from backend.config.settings import settings
from backend.config.db import get_db_cursor
from backend.algorithms.pipeline import DataIngestionPipeline
from backend.rag.vector_ingestion import VectorIngestion, COLLECTION_NAME_FULL, COLLECTION_NAME
from backend.rag.vector_search import VectorSearch

def load_data_and_qdrant(csv_path: str = None, max_records: int = 2000):
    print("\n=======================================================")
    print(" [1/3] LOADING DATASET INTO POSTGRESQL & ANALYTICS")
    print("=======================================================")
    
    # Locate dataset file
    candidate_paths = [
        csv_path,
        os.path.join(repo_root, "backend", "sample.csv"),
        os.path.join(repo_root, "data", "CTS", "CTS", "clean_training_data.csv"),
        os.path.join(repo_root, "analytics metrics", "analytics metrics", "sample.csv"),
    ]
    
    dataset_file = None
    for p in candidate_paths:
        if p and os.path.exists(p):
            dataset_file = p
            break
            
    if not dataset_file:
        print("  [-] Error: No sample CSV file found to load.")
        return False

    print(f"  [+] Loading dataset from: {dataset_file}")
    df = pd.read_csv(dataset_file)
    print(f"  [+] Read {len(df):,} rows from file")
    
    if max_records and len(df) > max_records:
        df = df.head(max_records)
        print(f"  [+] Using {len(df):,} rows for indexing")

    run_id = str(uuid.uuid4())
    user_id = "deepak"
    
    # Run through full ingestion pipeline (calculates KPIs, sentiment, BERTopic, and saves to PostgreSQL)
    pipeline = DataIngestionPipeline(run_id=run_id, user_id=user_id)
    pipeline.run_dataframe(df, source_name=os.path.basename(dataset_file), file_size_mb=0.5)
    print("  [OK] Ingestion Pipeline complete with PostgreSQL KPIs & topics populated.")

    print("\n=======================================================")
    print(" [2/3] GENERATING DENSE EMBEDDINGS & LOADING QDRANT DB")
    print("=======================================================")
    
    ingestor = VectorIngestion()
    ingestor.create_full_collection(COLLECTION_NAME_FULL)
    ingestor.create_collection()
    
    print(f"  [+] Embedding and loading records into Qdrant collection: {COLLECTION_NAME_FULL}...")
    ingestor.ingest_full_dataset(batch_size=500, max_records=max_records, collection_name=COLLECTION_NAME_FULL)
    
    print("\n=======================================================")
    print(" [3/3] VERIFYING QDRANT VECTOR SEARCH & LATENCY")
    print("=======================================================")
    
    searcher = VectorSearch()
    test_query = "delayed delivery and refund issue"
    t0 = time.time()
    results = searcher.search(test_query, limit=3)
    latency = (time.time() - t0) * 1000
    
    print(f"  [+] Test Query: '{test_query}'")
    print(f"  [+] Search Latency: {latency:.2f} ms")
    print(f"  [+] Retrieved Points: {len(results)}")
    for idx, r in enumerate(results, 1):
        txt = r.get("text", "")[:120].replace("\n", " ")
        score = r.get("score", 0.0)
        print(f"      {idx}. [Score: {score:.3f}] {txt}...")

    print("\n=======================================================")
    print(" [SUCCESS] QDRANT VECTOR DATABASE LOADED & VERIFIED!")
    print("=======================================================\n")
    return True

if __name__ == "__main__":
    load_data_and_qdrant()
