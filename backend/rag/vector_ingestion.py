import uuid
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from backend.rag.embedding_pipeline import EmbeddingPipeline


COLLECTION_NAME = "customer_conversations_retrieval_test"
COLLECTION_NAME_FULL = "customer_conversations_full"
VECTOR_SIZE = 384


def get_deterministic_point_id(tweet_id: str):
    s_id = str(tweet_id).strip()
    if s_id.isdigit():
        try:
            val = int(s_id)
            if 0 <= val < (1 << 63):
                return val
        except ValueError:
            pass
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"tweet:{s_id}"))


class VectorIngestion:
    """Ingest relevant PostgreSQL conversations into Qdrant collections."""

    def __init__(self):
        self.embedding_pipeline = EmbeddingPipeline()

        self.qdrant = QdrantClient(
            url="http://localhost:6333",
            timeout=60,
        )

    def create_collection(self):
        collections = [
            collection.name
            for collection in self.qdrant.get_collections().collections
        ]

        if COLLECTION_NAME not in collections:
            self.qdrant.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=VECTOR_SIZE,
                    distance=Distance.COSINE,
                ),
            )

            print(f"Created collection: {COLLECTION_NAME}")
        else:
            print(f"Collection already exists: {COLLECTION_NAME}")

    def create_full_collection(self, collection_name: str = COLLECTION_NAME_FULL):
        collections = [
            collection.name
            for collection in self.qdrant.get_collections().collections
        ]

        if collection_name not in collections:
            self.qdrant.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=VECTOR_SIZE,
                    distance=Distance.COSINE,
                ),
            )
            print(f"Created collection: {collection_name}")
        else:
            print(f"Collection already exists: {collection_name}")

    def ingest(self, limit: int = 1000):
        records = self.embedding_pipeline.fetch_relevant_records(
            limit=limit
        )

        print(f"Records fetched: {len(records)}")

        if not records:
            print("No records found.")
            return

        texts = [text for _, text in records]

        print("Generating embeddings...")

        embeddings = self.embedding_pipeline.embed(texts)

        points = []

        for index, ((tweet_id, text), embedding) in enumerate(
            zip(records, embeddings),
            start=1,
        ):
            points.append(
                PointStruct(
                    id=index,
                    vector=embedding.tolist(),
                    payload={
                        "tweet_id": str(tweet_id),
                        "text": text,
                    },
                )
            )

        print("Uploading vectors to Qdrant...")

        self.qdrant.upsert(
            collection_name=COLLECTION_NAME,
            points=points,
        )

        print(f"Inserted {len(points)} vectors.")

    def ingest_full_dataset(
        self,
        batch_size: int = 1000,
        max_records: int | None = None,
        collection_name: str = COLLECTION_NAME_FULL,
    ):
        self.create_full_collection(collection_name)

        print(
            f"Starting batch ingestion into '{collection_name}' "
            f"(batch_size={batch_size}, max_records={max_records})..."
        )

        total_processed = 0
        total_vectors_uploaded = 0

        for batch_index, batch_records in enumerate(
            self.embedding_pipeline.stream_conversations(
                batch_size=batch_size,
                max_records=max_records,
            ),
            start=1,
        ):
            if not batch_records:
                continue

            valid_records = [
                r for r in batch_records if r[1] and str(r[1]).strip()
            ]

            if not valid_records:
                continue

            texts = [str(r[1]) for r in valid_records]

            embeddings = self.embedding_pipeline.embed(texts)

            points = []
            for record, embedding in zip(valid_records, embeddings):
                (
                    tweet_id,
                    text,
                    author_id,
                    inbound,
                    created_at,
                    response_tweet_id,
                    in_response_to_tweet_id,
                ) = record

                point_id = get_deterministic_point_id(tweet_id)
                created_at_str = (
                    created_at.isoformat()
                    if hasattr(created_at, "isoformat")
                    else (str(created_at) if created_at else None)
                )

                payload = {
                    "tweet_id": str(tweet_id),
                    "text": str(text),
                    "author_id": str(author_id) if author_id is not None else None,
                    "inbound": bool(inbound) if inbound is not None else None,
                    "created_at": created_at_str,
                    "response_tweet_id": (
                        str(response_tweet_id)
                        if response_tweet_id is not None
                        else None
                    ),
                    "in_response_to_tweet_id": (
                        str(in_response_to_tweet_id)
                        if in_response_to_tweet_id is not None
                        else None
                    ),
                }

                points.append(
                    PointStruct(
                        id=point_id,
                        vector=embedding.tolist(),
                        payload=payload,
                    )
                )

            self.qdrant.upsert(
                collection_name=collection_name,
                points=points,
            )

            total_processed += len(batch_records)
            total_vectors_uploaded += len(points)

            print(
                f"Batch {batch_index}: Processed {len(batch_records)} records, "
                f"uploaded {len(points)} vectors. Cumulative uploaded: {total_vectors_uploaded}"
            )

        print(
            f"\nIngestion finished for '{collection_name}'. "
            f"Total records processed: {total_processed}, "
            f"total vectors uploaded: {total_vectors_uploaded}"
        )
        return total_processed, total_vectors_uploaded

    def verify(self):
        collection = self.qdrant.get_collection(
            COLLECTION_NAME
        )

        print("\n================================")
        print("QDRANT COLLECTION")
        print("================================")
        print(f"Collection: {COLLECTION_NAME}")
        print(f"Points: {collection.points_count}")
        print(
            f"Vector size: "
            f"{collection.config.params.vectors.size}"
        )
        print(
            f"Distance: "
            f"{collection.config.params.vectors.distance}"
        )

    def verify_full(self, collection_name: str = COLLECTION_NAME_FULL):
        collection = self.qdrant.get_collection(
            collection_name
        )

        print("\n================================")
        print("QDRANT FULL COLLECTION STATUS")
        print("================================")
        print(f"Collection: {collection_name}")
        print(f"Points count: {collection.points_count}")
        print(
            f"Vector size: "
            f"{collection.config.params.vectors.size}"
        )
        print(
            f"Distance: "
            f"{collection.config.params.vectors.distance}"
        )


if __name__ == "__main__":
    print("================================")
    print("POSTGRES → EMBEDDING → QDRANT")
    print("================================")

    ingestion = VectorIngestion()

    ingestion.create_collection()

    ingestion.ingest(limit=1000)

    ingestion.verify()

    print("\n================================")
    print("RETRIEVAL INGESTION COMPLETE")
    print("================================")