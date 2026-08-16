import re
import socket
from typing import Dict, Any, List, Optional
from backend.config.settings import settings
from backend.config.db import execute_query

class VectorDBTool:
    """Ultra-fast hybrid semantic and lexical search across ingested customer conversations."""

    _qdrant_checked = False
    _qdrant_available = False

    @classmethod
    def _is_qdrant_live(cls) -> bool:
        if cls._qdrant_checked:
            return cls._qdrant_available
        try:
            # Instant 0.1s socket test before launching heavyweight clients
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.15)
            result = sock.connect_ex(('localhost', 6333))
            sock.close()
            cls._qdrant_available = (result == 0)
        except Exception:
            cls._qdrant_available = False
        cls._qdrant_checked = True
        return cls._qdrant_available

    def _query_qdrant(self, query: str, limit: int = 5) -> List[dict]:
        if not self._is_qdrant_live():
            return []
        try:
            from backend.rag.vector_search import VectorSearch, COLLECTION_NAME_FULL, COLLECTION_NAME
            searcher = VectorSearch()
            collections = [c.name for c in searcher.qdrant.get_collections().collections]
            collection = COLLECTION_NAME_FULL if COLLECTION_NAME_FULL in collections else COLLECTION_NAME
            if collection not in collections:
                return []
            results = searcher.search(query, limit=limit, collection_name=collection)
            return [r for r in results if r.get("text")]
        except Exception as e:
            return []

    def _query_sql(self, query: str, limit: int = 5, **filters) -> List[str]:
        try:
            clean_q = re.sub(r"[^\w\s]", "", query).strip()
            words = [w for w in clean_q.split() if len(w) > 3 and w.lower() not in {"what", "which", "where", "tell", "show", "give", "have", "with", "this", "that", "like", "about", "customer", "issue", "inquiries", "inquiry", "support", "poor"}]
            first_kw = words[0] if words else (clean_q if len(clean_q) > 3 else "")
            table = self._source_table()
            where = [
                "COALESCE(text, clean_text, '') <> ''",
                "LENGTH(COALESCE(clean_text, text, '')) >= 15",
                "(inbound IS TRUE OR inbound IS NULL OR author_id NOT ILIKE '%help%' AND author_id NOT ILIKE '%support%')"
            ]
            params = []
            for key, candidates in {
                "company": ["brand", "company", "author_id"],
                "product": ["product"],
                "region": ["region"],
            }.items():
                value = filters.get(key)
                col = self._first_existing_column(table, candidates)
                if value and col:
                    where.append(f"LOWER({col}) = %s")
                    params.append(str(value).lower())

            if first_kw:
                where.append("(text ILIKE %s OR clean_text ILIKE %s)")
                params.extend([f"%{first_kw}%", f"%{first_kw}%"])

            where_sql = "WHERE " + " AND ".join(where)
            sql = f"SELECT COALESCE(clean_text, text) AS text FROM {table} {where_sql} ORDER BY CASE WHEN LOWER(sentiment) = 'negative' THEN 0 ELSE 1 END, created_at DESC NULLS LAST LIMIT %s;"
            rows = execute_query(sql, tuple(params + [limit]), fetch_all=True) or []
            results = [str(r["text"]) for r in rows if r.get("text")]
            if results:
                return results

            # Fallback to substantive customer inbounds
            fb_sql = f"SELECT COALESCE(clean_text, text) AS text FROM {table} WHERE LENGTH(COALESCE(clean_text, text, '')) >= 20 AND (inbound IS TRUE OR author_id NOT ILIKE '%help%') ORDER BY CASE WHEN LOWER(sentiment) = 'negative' THEN 0 ELSE 1 END, created_at DESC NULLS LAST LIMIT %s;"
            fb_rows = execute_query(fb_sql, (limit,), fetch_all=True) or []
            fb_results = [str(r["text"]) for r in fb_rows if r.get("text")]
            return fb_results if fb_results else []
        except Exception as e:
            return []

    def _source_table(self) -> str:
        try:
            row = execute_query("SELECT to_regclass('processed_conversations') AS table_name", fetch_one=True) or {}
            if row.get("table_name"):
                count = execute_query("SELECT COUNT(*) AS c FROM processed_conversations", fetch_one=True) or {}
                if int(count.get("c") or 0) > 0:
                    return "processed_conversations"
        except Exception:
            pass
        return "conversations"

    def _first_existing_column(self, table: str, candidates: List[str]) -> Optional[str]:
        try:
            rows = execute_query(
                "SELECT column_name FROM information_schema.columns WHERE table_name = %s;",
                (table,),
                fetch_all=True
            ) or []
            cols = {r["column_name"].lower() for r in rows if r.get("column_name")}
            return next((c for c in candidates if c.lower() in cols), None)
        except Exception:
            return None

    def run(self, actions: list[str], query: str, **filters) -> dict:
        results = {}
        for action in actions:
            if action in {"retrieve_similar_conversations", "search_conversations", "retrieve_pain_points", "retrieve_evidence"}:
                # 1. Try instantaneous PostgreSQL hybrid search first (< 5ms)
                sql_results = self._query_sql(query, limit=5, **filters)
                if sql_results:
                    results[action] = sql_results
                else:
                    # 2. Try Qdrant if available
                    qdrant_results = self._query_qdrant(query, limit=5)
                    results[action] = [r["text"] for r in qdrant_results if r.get("text")] or []
            else:
                results[action] = []
        return results
