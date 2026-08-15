import time
from backend.rag.vector_ingestion import VectorIngestion, COLLECTION_NAME_FULL


def main():
    print("==================================================")
    print("STARTING FULL DATASET BATCH INGESTION (1,048,575 RECORDS)")
    print("==================================================")

    t0 = time.time()
    ingestion = VectorIngestion()

    ingestion.create_full_collection(COLLECTION_NAME_FULL)

    total_processed, total_uploaded = ingestion.ingest_full_dataset(
        batch_size=2500,
        max_records=None,
        collection_name=COLLECTION_NAME_FULL,
    )

    t1 = time.time()
    elapsed_min = (t1 - t0) / 60.0

    print("\n==================================================")
    print("FULL INGESTION COMPLETED")
    print(f"Total Elapsed Time: {elapsed_min:.2f} minutes")
    print("==================================================")

    ingestion.verify_full(COLLECTION_NAME_FULL)


if __name__ == "__main__":
    main()

