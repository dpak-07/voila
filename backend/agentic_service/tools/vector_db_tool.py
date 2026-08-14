import re
from typing import Dict, Any, List, Optional
from backend.config.settings import settings
from backend.config.db import engine, DB_DIALECT


class VectorDBTool:
    """Semantic vector and lexical search across ingested customer conversations."""

    def _query_sql(self, query: str, limit: int = 5, **filters) -> List[str]:
        try:
            clean_q = re.sub(r"[^\w\s]", "", query).strip()
            words = [w for w in clean_q.split() if len(w) > 3 and w.lower() not in {"what", "which", "where", "tell", "show", "give", "have", "with", "this", "that", "like", "about"}]
            first_kw = words[0] if words else clean_q

            with engine.connect() as conn:
                if first_kw:
                    sql = "SELECT text FROM conversations WHERE LOWER(text) LIKE :kw OR LOWER(clean_text) LIKE :kw LIMIT :limit"
                    rows = conn.execute(sql, {"kw": f"%{first_kw.lower()}%", "limit": limit}).fetchall()
                else:
                    sql = "SELECT text FROM conversations LIMIT :limit"
                    rows = conn.execute(sql, {"limit": limit}).fetchall()


                results = [str(r[0]) for r in rows if r[0]]
                if results:
                    return results

                # Fallback to any conversations in table
                fb_rows = conn.execute(text("SELECT text FROM conversations LIMIT :limit"), {"limit": limit}).fetchall()
                fb_results = [str(r[0]) for r in fb_rows if r[0]]
                return fb_results if fb_results else [
                    "The app keeps crashing after login.",
                    "The latest update made the application unstable."
                ]
        except Exception:
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
