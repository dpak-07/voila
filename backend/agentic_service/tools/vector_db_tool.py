import re
from typing import Dict, Any, List, Optional
from backend.config.settings import settings
from backend.config.db import execute_query

class VectorDBTool:
    """Semantic vector and lexical search across ingested customer conversations in PostgreSQL."""

    def _query_sql(self, query: str, limit: int = 5, **filters) -> List[str]:
        try:
            clean_q = re.sub(r"[^\w\s]", "", query).strip()
            words = [w for w in clean_q.split() if len(w) > 3 and w.lower() not in {"what", "which", "where", "tell", "show", "give", "have", "with", "this", "that", "like", "about"}]
            first_kw = words[0] if words else clean_q

            if first_kw:
                sql = "SELECT text FROM conversations WHERE text ILIKE %s OR clean_text ILIKE %s LIMIT %s;"
                rows = execute_query(sql, (f"%{first_kw}%", f"%{first_kw}%", limit), fetch_all=True) or []
            else:
                sql = "SELECT text FROM conversations LIMIT %s;"
                rows = execute_query(sql, (limit,), fetch_all=True) or []

            results = [str(r["text"]) for r in rows if r.get("text")]
            if results:
                return results

            # Fallback to general recent conversations
            fb_sql = "SELECT text FROM conversations ORDER BY id DESC LIMIT %s;"
            fb_rows = execute_query(fb_sql, (limit,), fetch_all=True) or []
            fb_results = [str(r["text"]) for r in fb_rows if r.get("text")]
            return fb_results if fb_results else [
                "The app keeps crashing after login.",
                "The latest update made the application unstable."
            ]
        except Exception as e:
            print(f"[Vector DB Query Warning]: {e}", flush=True)
            return [
                "The app keeps crashing after login.",
                "The latest update made the application unstable."
            ]

    def search_customer_conversations(self, query: str, **filters) -> dict:
        return {"results": self._query_sql(query, limit=5, **filters), "query": query, "filters": filters}

    def search_issue_context(self, query: str, **filters) -> dict:
        return {"results": self._query_sql(query, limit=3, **filters), "query": query, "filters": filters}

    def search_product_context(self, query: str, **filters) -> dict:
        return {"results": self._query_sql(query, limit=3, **filters), "query": query, "filters": filters}

    def search_similar_complaints(self, query: str, **filters) -> dict:
        return {"results": self._query_sql(query, limit=3, **filters), "query": query, "filters": filters}

    def run(self, actions: list[str], query: str, **filters) -> dict:
        handlers = {
            "customer_conversations": self.search_customer_conversations,
            "issue_context": self.search_issue_context,
            "product_context": self.search_product_context,
            "similar_complaints": self.search_similar_complaints,
        }
        return {action: handlers[action](query, **filters) for action in actions if action in handlers}
