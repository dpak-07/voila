import threading
import time
from typing import Any, Dict, List, Optional
from backend.config.db import execute_query


def _ensure_log_table_exists():
    """Ensures rag_retrieval_logs table exists in PostgreSQL."""
    try:
        execute_query("""
            CREATE TABLE IF NOT EXISTS rag_retrieval_logs (
                id SERIAL PRIMARY KEY,
                query TEXT NOT NULL,
                normalized_query TEXT,
                retrieved_count INT DEFAULT 0,
                deduped_count INT DEFAULT 0,
                top_similarity_score NUMERIC DEFAULT 0.0,
                top_rerank_score NUMERIC DEFAULT 0.0,
                latency_embedding_ms NUMERIC DEFAULT 0.0,
                latency_retrieval_ms NUMERIC DEFAULT 0.0,
                latency_total_ms NUMERIC DEFAULT 0.0,
                is_domain_relevant BOOLEAN DEFAULT TRUE,
                validation_status VARCHAR(50) DEFAULT 'valid',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_rag_logs_created ON rag_retrieval_logs(created_at DESC);
        """, fetch_one=False, commit=True)
    except Exception as e:
        print(f"[RAG Log Table Warning]: {e}", flush=True)


class RetrievalLogger:
    """Problem 15: Retrieval Monitoring, Audit Logging & Continuous Evaluation."""

    _initialized = False

    @classmethod
    def log_event(cls, metrics: Dict[str, Any], query: str, normalized_query: str = ""):
        """Asynchronously records retrieval telemetry to PostgreSQL."""
        def _write():
            if not cls._initialized:
                _ensure_log_table_exists()
                cls._initialized = True
            try:
                execute_query("""
                    INSERT INTO rag_retrieval_logs (
                        query, normalized_query, retrieved_count, deduped_count,
                        top_similarity_score, top_rerank_score,
                        latency_embedding_ms, latency_retrieval_ms, latency_total_ms,
                        is_domain_relevant, validation_status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, (
                    query[:1000],
                    normalized_query[:1000] if normalized_query else query[:1000],
                    int(metrics.get("retrieved_count", 0)),
                    int(metrics.get("deduped_count", metrics.get("retrieved_count", 0))),
                    float(metrics.get("highest_score", 0.0)),
                    float(metrics.get("top_rerank_score", metrics.get("highest_score", 0.0))),
                    float(metrics.get("embedding_latency_ms", 0.0)),
                    float(metrics.get("qdrant_search_latency_ms", 0.0)),
                    float(metrics.get("total_retrieval_latency_ms", 0.0)),
                    bool(metrics.get("is_domain_relevant", True)),
                    str(metrics.get("validation_status", "valid"))[:50]
                ), fetch_one=False, commit=True)
            except Exception as e:
                # Non-blocking logging safeguard
                pass

        # Dispatch async background worker thread for zero latency overhead
        thread = threading.Thread(target=_write, daemon=True)
        thread.start()

    @classmethod
    def get_eval_summary(cls) -> Dict[str, Any]:
        """Retrieves aggregated evaluation metrics across recent retrieval logs."""
        try:
            row = execute_query("""
                SELECT 
                    COUNT(*) AS total_queries,
                    AVG(latency_total_ms) AS avg_latency_ms,
                    AVG(top_similarity_score) AS avg_top_similarity,
                    SUM(CASE WHEN is_domain_relevant IS TRUE THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0) AS domain_relevance_rate
                FROM rag_retrieval_logs;
            """, fetch_one=True) or {}
            return {
                "total_queries": int(row.get("total_queries") or 0),
                "avg_latency_ms": round(float(row.get("avg_latency_ms") or 0.0), 2),
                "avg_top_similarity": round(float(row.get("avg_top_similarity") or 0.0), 4),
                "domain_relevance_rate": round(float(row.get("domain_relevance_rate") or 1.0) * 100, 1)
            }
        except Exception:
            return {
                "total_queries": 0,
                "avg_latency_ms": 0.0,
                "avg_top_similarity": 0.0,
                "domain_relevance_rate": 100.0
            }
