from typing import Any, Dict, List, Optional
import re
from backend.config.db import execute_query
from backend.algorithms.analytics_engine import AnalyticsEngine

def _pg_text_search(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Full-text retrieval over PostgreSQL conversations using PostgreSQL text search."""
    try:
        clean_q = re.sub(r"[^\w\s]", "", query).strip()
        words = [
            w for w in clean_q.split()
            if len(w) > 3 and w.lower() not in {"what", "which", "where", "tell", "show", "give", "have", "with", "this", "that", "like", "about"}
        ]

        if not words:
            return []

        sql = """
        SELECT tweet_id, text, clean_text, sentiment, topic_keywords, created_at,
               ts_rank(to_tsvector('english', COALESCE(clean_text, '')), to_tsquery('english', %s)) AS rank
        FROM conversations
        WHERE to_tsvector('english', COALESCE(clean_text, '') || ' ' || COALESCE(text, ''))
              @@ to_tsquery('english', %s)
        ORDER BY rank DESC
        LIMIT %s;
        """
        ts_query = " & ".join(f"{w}:*" for w in words[:5])
        rows = execute_query(sql, (ts_query, ts_query, limit), fetch_all=True) or []

        results = []
        for r in rows:
            results.append({
                "_id": str(r.get("tweet_id") or ""),
                "text": (r.get("clean_text") or "") or (r.get("text") or ""),
                "sentiment": r.get("sentiment"),
                "topic_keywords": r.get("topic_keywords"),
                "created_at": r.get("created_at").isoformat() if hasattr(r.get("created_at"), "isoformat") else r.get("created_at"),
            })
        return results
    except Exception as e:
        print(f"PostgreSQL text search warning: {e}", flush=True)
        return []

def _generate_answer(query: str, documents: List[Dict[str, Any]]) -> str:
    q_lower = query.lower()
    engine = AnalyticsEngine()
    analysis = engine.run_dynamic_analysis()
    topics = analysis.get("topic_summaries", [])
    kpis = analysis.get("kpi_metrics", {})

    # 1. Intent: Topic / Cluster Listing Query
    if any(k in q_lower for k in ["cluster", "topic", "category", "categories", "issues list", "pain points"]):
        if not topics:
            return "No topic clusters found. Please upload a dataset to view clustered customer topics."

        topic_lines = []
        for i, t in enumerate(topics, 1):
            name = t.get("topic_keywords", "General")
            vol = t.get("volume", 0)
            neg = t.get("negative_complaints", t.get("negative_volume", 0))
            esc = t.get("escalation_cases", 0)
            resp = t.get("avg_response_time", 0.0)
            topic_lines.append(f"{i}. **{name}** — {vol} total cases ({neg} complaints, {esc} escalations, {resp:.1f} mins avg response)")

        return "Here are the topic clusters extracted by BERTopic from the customer data:\n\n" + "\n".join(topic_lines)

    # 2. Intent: KPI / Service Metric Query
    if any(k in q_lower for k in ["kpi", "resolution rate", "escalation rate", "reopen rate", "response time", "performance", "metric", "overview"]):
        return (
            f"📊 **Current Service Operations KPIs:**\n\n"
            f"• **Total Conversations**: {kpis.get('total_conversations', 0):,}\n"
            f"• **Resolution Rate**: {kpis.get('resolution_rate', 0.0):.1f}%\n"
            f"• **Escalation Rate**: {kpis.get('escalation_rate', 0.0):.1f}%\n"
            f"• **Reopen Rate**: {kpis.get('reopen_rate', 0.0):.1f}%\n"
            f"• **Average Response Time**: {kpis.get('avg_response_time_minutes', 0.0):.1f} minutes\n"
            f"• **Negative Sentiment Share**: {kpis.get('negative_sentiment_percentage', 0.0):.1f}%"
        )

    # 3. Intent: Specific Topic or Complaint Search
    if documents:
        total_found = len(documents)
        example = documents[0].get("text", "")
        topic = documents[0].get("topic_keywords", "General")
        return (
            f"Found **{total_found} customer conversation(s)** relevant to '{query}' under cluster **'{topic}'**.\n\n"
            f"💬 *Example customer message:* \"{example}\"\n\n"
            f"Check the topic breakdown table for complete resolution stats."
        )

    # 4. Fallback: Search matched topics directly
    matching_topics = [t for t in topics if any(w in t.get("topic_keywords", "").lower() for w in q_lower.split())]
    if matching_topics:
        t = matching_topics[0]
        return (
            f"Found topic cluster **'{t.get('topic_keywords')}'** matching your query:\n"
            f"• Total Cases: {t.get('volume', 0)}\n"
            f"• Complaints: {t.get('negative_complaints', t.get('negative_volume', 0))}\n"
            f"• Avg Response Time: {t.get('avg_response_time', 0.0):.1f} mins"
        )

    return (
        f"I analyzed your query across the dataset. The primary complaint driver is **'{topics[0].get('topic_keywords', 'General')}'** with {topics[0].get('volume', 0)} cases. "
        f"You can ask me about specific topics (e.g. *'What are the battery issues?'* or *'What is our resolution rate?'*)."
    )

async def rag_response(query: str, documents: Optional[List[Dict[str, Any]]] = None, limit: int = 10) -> Dict[str, Any]:
    retrieved = _pg_text_search(query, limit=limit)
    if not retrieved and documents:
        q_lower = query.lower()
        retrieved = [doc for doc in documents if q_lower in str(doc.get("text", "")).lower()][:limit]

    return {
        "query": query,
        "retrieved_count": len(retrieved),
        "answer": _generate_answer(query, retrieved),
        "documents": retrieved,
    }
