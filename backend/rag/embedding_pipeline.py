import os
import re
import numpy as np
import psycopg2
from dotenv import load_dotenv

load_dotenv("backend/.env")

try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False

try:
    from backend.rag.vector_search import SimpleEmbeddingModel, VECTOR_DIM
except ImportError:
    from rag.vector_search import SimpleEmbeddingModel, VECTOR_DIM


class EmbeddingPipeline:
    """Fetch customer conversations from PostgreSQL and generate normalized embeddings."""

    def __init__(self):
        if HAS_SENTENCE_TRANSFORMERS:
            try:
                self.model = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception:
                self.model = SimpleEmbeddingModel(dim=VECTOR_DIM)
        else:
            self.model = SimpleEmbeddingModel(dim=VECTOR_DIM)

        try:
            from backend.config.settings import settings
        except ImportError:
            from config.settings import settings

        self.db_config = {
            "host": settings.postgres_host,
            "port": settings.postgres_port,
            "database": settings.postgres_db,
            "user": settings.postgres_user,
            "password": settings.postgres_password,
        }

    def fetch_sample(self, limit: int = 10):
        """Fetch a small sample for basic testing."""
        conn = psycopg2.connect(**self.db_config)
        try:
            with conn.cursor() as cursor:
                table = self._source_table(cursor)
                cursor.execute(
                    f"""
                    SELECT tweet_id, text
                    FROM {table}
                    WHERE text IS NOT NULL AND text <> ''
                    ORDER BY tweet_id
                    LIMIT %s
                    """,
                    (limit,),
                )
                return cursor.fetchall()
        finally:
            conn.close()

    def fetch_relevant_records(self, limit: int = 1000):
        """Fetch records relevant to the support conversation stream."""
        conn = psycopg2.connect(**self.db_config)
        try:
            with conn.cursor() as cursor:
                table = self._source_table(cursor)
                cursor.execute(
                    f"""
                    SELECT tweet_id, text
                    FROM {table}
                    WHERE text IS NOT NULL AND text <> ''
                    ORDER BY tweet_id
                    LIMIT %s
                    """,
                    (limit,),
                )
                return cursor.fetchall()
        finally:
            conn.close()

    def stream_conversations(
        self,
        batch_size: int = 1000,
        max_records: int | None = None,
        start_offset: int = 0,
    ):
        """
        Stream records from PostgreSQL in batches using server-side cursor.
        Yields batches of tuples:
        (tweet_id, text, author_id, inbound, created_at, response_tweet_id, in_response_to_tweet_id)
        """
        conn = psycopg2.connect(**self.db_config)
        cursor_name = "customer_conversations_stream_cursor"
        try:
            with conn.cursor(name=cursor_name) as cursor:
                cursor.itersize = batch_size
                table = self._source_table(conn.cursor())
                query = f"""
                    SELECT
                        tweet_id,
                        text,
                        author_id,
                        inbound,
                        created_at,
                        response_tweet_id,
                        in_response_to_tweet_id
                    FROM {table}
                    WHERE text IS NOT NULL AND text <> ''
                    ORDER BY tweet_id
                """
                cursor.execute(query)

                if start_offset > 0:
                    skipped = 0
                    while skipped < start_offset:
                        to_fetch = min(batch_size, start_offset - skipped)
                        rows = cursor.fetchmany(to_fetch)
                        if not rows:
                            break
                        skipped += len(rows)

                fetched_total = 0
                while True:
                    to_fetch = batch_size
                    if max_records is not None:
                        remaining = max_records - fetched_total
                        if remaining <= 0:
                            break
                        to_fetch = min(batch_size, remaining)

                    rows = cursor.fetchmany(to_fetch)
                    if not rows:
                        break

                    fetched_total += len(rows)
                    yield rows
        finally:
            conn.close()

    def embed(self, texts: list[str]):
        """Generate normalized 384-dimensional embeddings."""
        if not texts:
            return np.array([])

        if hasattr(self.model, "encode"):
            res = self.model.encode(texts, normalize_embeddings=True)
            if isinstance(res, list):
                return np.array(res, dtype=np.float32)
            if isinstance(res, np.ndarray) and res.ndim == 1:
                # If single vector encoded
                return np.array([self.model.encode(t, normalize_embeddings=True) for t in texts], dtype=np.float32)
            return res
        return np.array([SimpleEmbeddingModel(dim=VECTOR_DIM).encode(t) for t in texts], dtype=np.float32)

    def _source_table(self, cursor) -> str:
        """Use enriched processed rows for RAG when available, else raw conversations."""
        try:
            cursor.execute("SELECT to_regclass('processed_conversations')")
            row = cursor.fetchone()
            if row and row[0]:
                cursor.execute("SELECT COUNT(*) FROM processed_conversations")
                if int(cursor.fetchone()[0] or 0) > 0:
                    return "processed_conversations"
        except Exception:
            pass
        return "conversations"


if __name__ == "__main__":
    print("================================")
    print("EMBEDDING PIPELINE TEST")
    print("================================")

    pipeline = EmbeddingPipeline()
    records = pipeline.fetch_relevant_records(limit=10)
    print(f"Sample records fetched: {len(records)}")

    texts = [text for _, text in records]
    embeddings = pipeline.embed(texts)
    print(f"Embeddings generated: {len(embeddings)}")
    if len(embeddings) > 0:
        print(f"Embedding shape: {embeddings.shape}")

    print("\n================================")
    print("EMBEDDING PIPELINE READY")
    print("================================")
