from typing import Any, Dict, List, Optional
import re
from pymongo import MongoClient
from backend.config.settings import settings
from backend.algorithms.analytics_engine import AnalyticsEngine
from backend.algorithms.topic_clustering import generate_cluster_name

def _postgres_text_search(query: str, limit: int = 15) -> List[Dict[str, Any]]:
    try:
        from backend.config.db import execute_query
        clean_q = re.sub(r"[^\w\s]", "", query).strip()
        stop_words = {
            "what", "which", "where", "tell", "show", "give", "have", "with", "this", "that", 
            "like", "about", "issue", "inquiries", "inquiry", "problem", "rank", "customer", 
            "support", "poor", "cases", "conversations"
        }
        words = [w for w in clean_q.split() if len(w) > 2 and w.lower() not in stop_words]
        
        # 1. Primary Keyword Search with Inbound Customer Priority & Substantive Length
        if words:
            conditions = []
            params = []
            for w in words[:4]:
                conditions.append("(text ILIKE %s OR clean_text ILIKE %s OR topic_keywords ILIKE %s)")
                params.extend([f"%{w}%", f"%{w}%", f"%{w}%"])
            where_clause = " OR ".join(conditions)
            sql_words = f"""
            SELECT tweet_id, text, clean_text, sentiment, topic_keywords, author_id, created_at, inbound, response_time_minutes, brand, company, region, product
            FROM processed_conversations
            WHERE ({where_clause})
              AND LENGTH(COALESCE(clean_text, text, '')) >= 15
            ORDER BY 
                CASE WHEN inbound IS TRUE THEN 0 ELSE 1 END,
                CASE WHEN LOWER(sentiment) = 'negative' THEN 0 ELSE 1 END,
                tweet_id DESC
            LIMIT %s;
            """
            params.append(limit)
            results = execute_query(sql_words, tuple(params), fetch_all=True)
            if results:
                return _format_rag_results(results)

        # 2. Search by sentiment priority if query implies friction
        is_friction_query = any(k in query.lower() for k in ["poor", "bad", "issue", "complaint", "friction", "pain", "delay", "crash", "bug", "broken", "refund"])
        sent_filter = "LOWER(sentiment) = 'negative'" if is_friction_query else "1=1"
        
        sql_fallback = f"""
        SELECT tweet_id, text, clean_text, sentiment, topic_keywords, author_id, created_at, inbound, response_time_minutes, brand, company, region, product
        FROM processed_conversations
        WHERE {sent_filter}
          AND inbound IS TRUE
          AND LENGTH(COALESCE(clean_text, text, '')) >= 20
        ORDER BY tweet_id DESC
        LIMIT %s;
        """
        results = execute_query(sql_fallback, (limit,), fetch_all=True) or []
        return _format_rag_results(results)
    except Exception as e:
        print(f"[PostgreSQL Text Search Error]: {e}", flush=True)
        return []

def _format_rag_results(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    for r in results:
        r["id"] = str(r.get("tweet_id", ""))
        r["_id"] = str(r.get("tweet_id", ""))
        inbound = bool(r.get("inbound", True))
        r["is_customer"] = inbound
        r["is_company_response"] = not inbound
        raw_kw = r.get("topic_keywords", "")
        r["topic_name"] = generate_cluster_name(raw_kw) if raw_kw else "General Support & Inquiries"
    return results or []

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
            raw_name = t.get("topic_keywords", "General")
            name = generate_cluster_name(raw_name)
            vol = t.get("volume", 0)
            neg = t.get("negative_complaints", t.get("negative_volume", 0))
            esc = t.get("escalation_cases", 0)
            resp = t.get("avg_response_time", 0.0)
            topic_lines.append(f"{i}. **{name}** — {vol:,} total cases ({neg:,} complaints, {esc:,} escalations, {resp:.1f}m avg response)")
        
        return "Here are the primary customer issue categories identified across the dataset:\n\n" + "\n".join(topic_lines)

    # 2. Intent: KPI / Service Metric Query
    if any(k in q_lower for k in ["kpi", "resolution rate", "escalation rate", "reopen rate", "response time", "performance", "metric", "overview"]):
        return (
            f"📊 **Current Customer Service Telemetry & Operations KPIs:**\n\n"
            f"• **Total Analyzed Messages**: {kpis.get('total_conversations', 0):,}\n"
            f"• **First Contact Resolution (FCR)**: {kpis.get('resolution_rate', 0.0):.1f}%\n"
            f"• **Escalation Rate**: {kpis.get('escalation_rate', 0.0):.1f}%\n"
            f"• **Reopen Rate**: {kpis.get('reopen_rate', 0.0):.1f}%\n"
            f"• **Average Response SLA Latency**: {kpis.get('avg_response_time_minutes', 0.0):.1f} minutes\n"
            f"• **Customer Friction (Negative Tone)**: {kpis.get('negative_sentiment_percentage', 0.0):.1f}%"
        )

    # 3. Intent: Specific Topic or Complaint Search
    if documents:
        total_found = len(documents)
        customer_docs = [d for d in documents if d.get("is_customer")]
        target_doc = customer_docs[0] if customer_docs else documents[0]
        example = target_doc.get("clean_text") or target_doc.get("text", "")
        raw_topic = target_doc.get("topic_keywords", "General Inquiries")
        topic_title = generate_cluster_name(raw_topic)

        return (
            f"Found **{total_found} customer conversation(s)** relevant to '{query}' categorized under **'{topic_title}'**.\n\n"
            f"💬 *Sample Customer Voice:* \"{example}\"\n\n"
            f"View the full topic matrix and friction trends on the dashboard."
        )

    # 4. Fallback: Search matched topics directly
    matching_topics = [t for t in topics if any(w in t.get("topic_keywords", "").lower() for w in q_lower.split())]
    if matching_topics:
        t = matching_topics[0]
        name = generate_cluster_name(t.get("topic_keywords", ""))
        return (
            f"Found topic category **'{name}'** matching your query:\n"
            f"• Total Volume: {t.get('volume', 0):,} cases\n"
            f"• Negative Complaints: {t.get('negative_complaints', t.get('negative_volume', 0)):,}\n"
            f"• Average Response Time: {t.get('avg_response_time', 0.0):.1f} mins"
        )

    top_topic = generate_cluster_name(topics[0].get('topic_keywords', 'General Inquiries')) if topics else 'General Inquiries'
    top_vol = topics[0].get('volume', 0) if topics else 0
    return (
        f"I analyzed your query across all customer support records. The primary issue driver is **'{top_topic}'** with {top_vol:,} cases. "
        f"You can ask me about specific issues (e.g. *'What are the delivery tracking delays?'* or *'What is our average SLA response latency?'*)."
    )

async def rag_response(query: str, documents: Optional[List[Dict[str, Any]]] = None, limit: int = 10) -> Dict[str, Any]:
    retrieved = _postgres_text_search(query, limit=limit)
    if not retrieved and documents:
        q_lower = query.lower()
        retrieved = [doc for doc in documents if q_lower in str(doc.get("text", "")).lower()][:limit]

    return {
        "query": query,
        "retrieved_count": len(retrieved),
        "answer": _generate_answer(query, retrieved),
        "documents": retrieved,
    }
