import os
import uuid
from typing import Optional

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, PointStruct, VectorParams
    HAS_QDRANT = True
except ImportError:
    HAS_QDRANT = False
    QdrantClient = None

try:
    from backend.rag.embedding_pipeline import EmbeddingPipeline
    from backend.rag.vector_search import COLLECTION_NAME, COLLECTION_NAME_FULL, VECTOR_DIM
except ImportError:
    from rag.embedding_pipeline import EmbeddingPipeline
    from rag.vector_search import COLLECTION_NAME, COLLECTION_NAME_FULL, VECTOR_DIM


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
    """Ingest relevant PostgreSQL conversations into Qdrant collections with auto-failover."""

    def __init__(self, prefer_server: bool = True):
        self.embedding_pipeline = EmbeddingPipeline()
        self.qdrant = None
        self.mode = "none"

        if HAS_QDRANT:
            if prefer_server:
                try:
                    client = QdrantClient(url="http://localhost:6333", timeout=1, check_compatibility=False)
                    client.get_collections()
                    self.qdrant = client
                    self.mode = "server"
                except Exception:
                    self.qdrant = None

            if not self.qdrant:
                try:
                    storage_path = os.path.join(os.path.dirname(__file__), "qdrant_storage")
                    os.makedirs(storage_path, exist_ok=True)
                    self.qdrant = QdrantClient(path=storage_path)
                    self.mode = "embedded"
                except Exception:
                    self.qdrant = QdrantClient(":memory:")
                    self.mode = "memory"

    def create_collection(self, collection_name: str = COLLECTION_NAME):
        if not self.qdrant:
            return
        collections = [collection.name for collection in self.qdrant.get_collections().collections]
        if collection_name not in collections:
            self.qdrant.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
            )
            print(f"Created collection: {collection_name}")
        else:
            print(f"Collection already exists: {collection_name}")

    def create_full_collection(self, collection_name: str = COLLECTION_NAME_FULL):
        self.create_collection(collection_name)

    def ingest(self, limit: int = 1000):
        if not self.qdrant:
            print("Qdrant not initialized.")
            return

        self.create_collection(COLLECTION_NAME)
        records = self.embedding_pipeline.fetch_relevant_records(limit=limit)
        print(f"Records fetched from PostgreSQL: {len(records)}")
        if not records:
            print("No records found to ingest.")
            return

        texts = [str(text) for _, text in records]
        embeddings = self.embedding_pipeline.embed(texts)

        points = []
        for index, ((tweet_id, text), embedding) in enumerate(zip(records, embeddings), start=1):
            emb_list = embedding.tolist() if hasattr(embedding, "tolist") else list(embedding)
            points.append(
                PointStruct(
                    id=index,
                    vector=emb_list,
                    payload={
                        "tweet_id": str(tweet_id),
                        "text": str(text),
                    },
                )
            )

        for col in [COLLECTION_NAME, COLLECTION_NAME_FULL]:
            self.create_collection(col)
            print(f"Uploading {len(points)} vectors to Qdrant collection '{col}' ({self.mode} mode)...")
            self.qdrant.upsert(collection_name=col, points=points)
            print(f"Successfully inserted {len(points)} vectors into '{col}'.")

    def verify(self, collection_name: str = COLLECTION_NAME):
        if not self.qdrant:
            print("Qdrant is not available.")
            return
        collection = self.qdrant.get_collection(collection_name)
        print("\n================================")
        print("QDRANT COLLECTION STATUS")
        print("================================")
        print(f"Collection:   {collection_name}")
        print(f"Mode:         {self.mode}")
        print(f"Points Count: {collection.points_count}")
        print(f"Vector Size:  {collection.config.params.vectors.size}")
        print(f"Distance:     {collection.config.params.vectors.distance}")
        print("================================\n")


if __name__ == "__main__":
    print("================================")
    print("POSTGRES -> QDRANT VECTOR INGESTION")
    print("================================")

    ingestion = VectorIngestion()
    ingestion.create_collection()
    ingestion.ingest(limit=500)
    ingestion.verify()