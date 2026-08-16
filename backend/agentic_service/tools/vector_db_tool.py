import re
from typing import Dict, Any, List, Optional
from backend.config.settings import settings
from backend.config.db import execute_query

class VectorDBTool:
    """Semantic vector and lexical search across ingested customer conversations in PostgreSQL."""

    def _query_qdrant(self, query: str, limit: int = 5) -> List[dict]:
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
            print(f"[Qdrant RAG Fallback]: {e}", flush=True)
            return []

    def _query_sql(self, query: str, limit: int = 5, **filters) -> List[str]:
        try:
            clean_q = re.sub(r"[^\w\s]", "", query).strip()
            words = [w for w in clean_q.split() if len(w) > 3 and w.lower() not in {"what", "which", "where", "tell", "show", "give", "have", "with", "this", "that", "like", "about", "customer", "issue", "inquiries", "inquiry", "support", "poor"}]
            first_kw = words[0] if words else (clean_q if len(clean_q) > 3 else "")
            table = self._source_table()
            where = [
                "COALESCE(text, clean_text, '') <> ''",
                "LENGTH(COALESCE(clean_text, text, '')) >= 15",  # Filter out trivial acknowledgments like "done, thanks"
                "(inbound IS TRUE OR inbound IS NULL OR author_id NOT ILIKE '%help%' AND author_id NOT ILIKE '%support%')"  # Prioritize customer inbounds
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

            # Robust Fallback to substantive customer inbounds
            fb_sql = f"SELECT COALESCE(clean_text, text) AS text FROM {table} WHERE LENGTH(COALESCE(clean_text, text, '')) >= 20 AND (inbound IS TRUE OR author_id NOT ILIKE '%help%') ORDER BY CASE WHEN LOWER(sentiment) = 'negative' THEN 0 ELSE 1 END, created_at DESC NULLS LAST LIMIT %s;"
            fb_rows = execute_query(fb_sql, (limit,), fetch_all=True) or []
            fb_results = [str(r["text"]) for r in fb_rows if r.get("text")]
            return fb_results if fb_results else []
        except Exception as e:
            print(f"[Vector DB Query Warning]: {e}", flush=True)
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
                "SELECT column_name FROM information_schema.columns WHERE table_name = %s",
                (table,),
                fetch_all=True,
            ) or []
            cols = {str(r.get("column_name")).lower(): str(r.get("column_name")) for r in rows}
            for c in candidates:
                if c.lower() in cols:
                    return cols[c.lower()]
        except Exception:
            pass
        return None

    def search_customer_conversations(self, query: str, **filters) -> dict:
        qdrant_results = self._query_qdrant(query, limit=5)
        if qdrant_results:
            return {"results": qdrant_results, "query": query, "filters": filters, "source": "qdrant"}
        return {"results": self._query_sql(query, limit=5, **filters), "query": query, "filters": filters, "source": "postgres"}

    def search_issue_context(self, query: str, **filters) -> dict:
        qdrant_results = self._query_qdrant(query, limit=3)
        if qdrant_results:
            return {"results": qdrant_results, "query": query, "filters": filters, "source": "qdrant"}
        return {"results": self._query_sql(query, limit=3, **filters), "query": query, "filters": filters, "source": "postgres"}

    def search_product_context(self, query: str, **filters) -> dict:
        return {"results": self._query_sql(query, limit=3, **filters), "query": query, "filters": filters}

    def search_similar_complaints(self, query: str, **filters) -> dict:
        qdrant_results = self._query_qdrant(query, limit=3)
        if qdrant_results:
            return {"results": qdrant_results, "query": query, "filters": filters, "source": "qdrant"}
        return {"results": self._query_sql(query, limit=3, **filters), "query": query, "filters": filters, "source": "postgres"}

    def run(self, actions: list[str], query: str, **filters) -> dict:
        handlers = {
            "customer_conversations": self.search_customer_conversations,
            "issue_context": self.search_issue_context,
            "product_context": self.search_product_context,
            "similar_complaints": self.search_similar_complaints,
        }
        return {action: handlers[action](query, **filters) for action in actions if action in handlers}
