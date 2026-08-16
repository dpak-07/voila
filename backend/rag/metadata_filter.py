from typing import Any, Dict, List, Optional
from qdrant_client.http import models as qmodels


def build_qdrant_metadata_filter(
    customer_only: bool = True,
    cluster_id: Optional[int] = None,
    sentiment: Optional[str] = None,
    author_exclude_keywords: Optional[List[str]] = None
) -> Optional[qmodels.Filter]:
    """Problem 12: Builds Qdrant metadata filters to exclude agent-only responses and target specific cohorts."""
    must_conditions = []
    must_not_conditions = []

    if customer_only:
        # Prioritize inbound customer messages
        must_conditions.append(
            qmodels.FieldCondition(
                key="inbound",
                match=qmodels.MatchValue(value=True)
            )
        )

    if cluster_id is not None:
        must_conditions.append(
            qmodels.FieldCondition(
                key="cluster_id",
                match=qmodels.MatchValue(value=cluster_id)
            )
        )

    if sentiment:
        must_conditions.append(
            qmodels.FieldCondition(
                key="sentiment",
                match=qmodels.MatchValue(value=sentiment.lower())
            )
        )

    if not must_conditions and not must_not_conditions:
        return None

    return qmodels.Filter(
        must=must_conditions if must_conditions else None,
        must_not=must_not_conditions if must_not_conditions else None
    )


def apply_in_memory_metadata_filter(
    documents: List[Dict[str, Any]],
    customer_only: bool = True,
    sentiment: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Filters a candidate document list in-memory based on metadata attributes."""
    if not documents:
        return []

    filtered = []
    for doc in documents:
        inbound = doc.get("inbound")
        author_id = str(doc.get("author_id", "")).lower()
        doc_sentiment = str(doc.get("sentiment", "")).lower()

        # Check customer-only constraint
        if customer_only:
            if inbound is False or "support" in author_id or "help" in author_id:
                continue

        # Check sentiment constraint
        if sentiment and doc_sentiment and doc_sentiment != sentiment.lower():
            continue

        filtered.append(doc)

    return filtered if filtered else documents # If strict filter leaves 0, fallback to candidate set
