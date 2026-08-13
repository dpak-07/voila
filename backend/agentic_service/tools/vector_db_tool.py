class VectorDBTool:
    """Replaceable interface for retrieval over customer conversations and context."""

    def search_customer_conversations(self, query: str, **filters) -> dict:
        return {
            "results": [
                "The app keeps crashing after login.",
                "The latest update made the application unstable.",
            ],
            "query": query,
            "filters": filters,
        }

    def search_issue_context(self, query: str, **filters) -> dict:
        return {"results": ["App crash reports increased after the latest update."], "query": query, "filters": filters}

    def search_product_context(self, query: str, **filters) -> dict:
        return {"results": ["Most complaints reference the mobile app."], "query": query, "filters": filters}

    def search_similar_complaints(self, query: str, **filters) -> dict:
        return {"results": ["I cannot log in after resetting my password."], "query": query, "filters": filters}

    def run(self, actions: list[str], query: str, **filters) -> dict:
        handlers = {
            "customer_conversations": self.search_customer_conversations,
            "issue_context": self.search_issue_context,
            "product_context": self.search_product_context,
            "similar_complaints": self.search_similar_complaints,
        }
        return {action: handlers[action](query, **filters) for action in actions if action in handlers}
