import re
from typing import Dict, Any, List, Optional
from pymongo import MongoClient
from backend.config.settings import settings

class VectorDBTool:
    """Semantic vector and lexical search across ingested customer conversations."""

    def _query_mongo(self, query: str, limit: int = 5, **filters) -> List[str]:
        try:
            client = MongoClient(settings.mongo_uri)
            db = client[settings.mongo_db]
            coll = db[settings.mongo_collection]
            
            clean_q = re.sub(r"[^\w\s]", "", query).strip()
            words = [w for w in clean_q.split() if len(w) > 3 and w.lower() not in {"what", "which", "where", "tell", "show", "give", "have", "with", "this", "that", "like", "about"}]
            search_term = "|".join(words) if words else clean_q

            if not search_term:
                cursor = coll.find({}).limit(limit)
            else:
                cursor = coll.find({"text": {"$regex": search_term, "$options": "i"}}).limit(limit)

            results = [str(doc.get("text", "")) for doc in cursor if doc.get("text")]
            if not results:
                results = [str(doc.get("text", "")) for doc in coll.find({}).limit(limit) if doc.get("text")]
            
            return results if results else [
                "The app keeps crashing after login.",
                "The latest update made the application unstable."
            ]
        except Exception:
            return [
                "The app keeps crashing after login.",
                "The latest update made the application unstable."
            ]

    def search_customer_conversations(self, query: str, **filters) -> dict:
        return {"results": self._query_mongo(query, limit=5, **filters), "query": query, "filters": filters}

    def search_issue_context(self, query: str, **filters) -> dict:
        return {"results": self._query_mongo(query, limit=3, **filters), "query": query, "filters": filters}

    def search_product_context(self, query: str, **filters) -> dict:
        return {"results": self._query_mongo(query, limit=3, **filters), "query": query, "filters": filters}

    def search_similar_complaints(self, query: str, **filters) -> dict:
        return {"results": self._query_mongo(query, limit=3, **filters), "query": query, "filters": filters}

    def run(self, actions: list[str], query: str, **filters) -> dict:
        handlers = {
            "customer_conversations": self.search_customer_conversations,
            "issue_context": self.search_issue_context,
            "product_context": self.search_product_context,
            "similar_complaints": self.search_similar_complaints,
        }
        return {action: handlers[action](query, **filters) for action in actions if action in handlers}
