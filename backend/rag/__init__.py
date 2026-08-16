from typing import Any, Dict, List, Optional
import re
from backend.config.settings import settings
from backend.algorithms.analytics_engine import AnalyticsEngine
from backend.algorithms.topic_clustering import generate_cluster_name

def _postgres_text_search(query: str, limit: int = 15) -> List[Dict[str, Any]]:
    try:
        from backend.config.db import execute_query
        clean_q = re.sub(r"[^\w\s]", "", query).strip()
        q_lower = query.lower().strip()
        
        # Map frontend display names or keywords to exact backend topic_keywords in database
        cluster_map = {
            "poor customer support": "Poor customer support",
            "support inquiries": "Poor customer support",
            "customer service": "Poor customer support",
            "application malfunction": "Application malfunction",
            "crashes": "Application malfunction",
            "stability": "Application malfunction",
            "app crash": "Application malfunction",
            "delivery": "Delivery or order issue",
            "order issue": "Delivery or order issue",
            "tracking": "Delivery or order issue",
            "shipment": "Delivery or order issue",
            "incorrect or unexpected charges": "Incorrect or unexpected charges",
            "billing": "Incorrect or unexpected charges",
            "invoices": "Incorrect or unexpected charges",
            "charges": "Incorrect or unexpected charges",
            "payment": "Incorrect or unexpected charges",
            "account access problem": "Account access problem",
            "password": "Account access problem",
            "auth": "Account access problem",
            "login": "Account access problem",
            "2fa": "Account access problem",
            "poor or unstable connectivity": "Poor or unstable connectivity",
            "connectivity": "Poor or unstable connectivity",
            "network": "Poor or unstable connectivity",
            "signal": "Poor or unstable connectivity",
            "technical failure": "Technical failure",
            "plan or subscription problem": "Plan or subscription problem",
            "subscription": "Plan or subscription problem",
            "refund delay or failure": "Refund delay or failure",
            "refund": "Refund delay or failure",
            "dispute": "Refund delay or failure",
        }

        matched_cluster = None
        for k, v in cluster_map.items():
            if k in q_lower:
                matched_cluster = v
                break

        # 1. High-Precision Direct Topic Cluster Query
        if matched_cluster:
            sql_cluster = """
            SELECT tweet_id, text, clean_text, sentiment, topic_keywords, author_id, created_at, inbound, response_time_minutes, brand, company, region, product
            FROM processed_conversations
            WHERE topic_keywords = %s
              AND inbound IS TRUE
              AND LENGTH(COALESCE(clean_text, text, '')) >= 25
            ORDER BY 
                CASE WHEN LOWER(sentiment) = 'negative' THEN 0 ELSE 1 END,
                tweet_id DESC
            LIMIT %s;
            """
            results = execute_query(sql_cluster, (matched_cluster, limit), fetch_all=True)
            if results:
                return _format_rag_results(results)

        # 2. Semantic Keyword Search across clean_text and text
        stop_words = {
            "what", "which", "where", "tell", "show", "give", "have", "with", "this", "that", 
            "like", "about", "the", "a", "an", "is", "are", "was", "were", "for", "from", "and", "or", "inquiries", "inquiry"
        }
        words = [w for w in clean_q.split() if len(w) > 2 and w.lower() not in stop_words]
        
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
              AND inbound IS TRUE
              AND LENGTH(COALESCE(clean_text, text, '')) >= 25
            ORDER BY 
                CASE WHEN LOWER(sentiment) = 'negative' THEN 0 ELSE 1 END,
                tweet_id DESC
            LIMIT %s;
            """
            params.append(limit)
            results = execute_query(sql_words, tuple(params), fetch_all=True)
            if results:
                return _format_rag_results(results)

        return []
    except Exception as e:
        print(f"[PostgreSQL Text Search Error]: {e}", flush=True)
        return []

def _format_rag_results(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    negative_indicators = {
        "suck", "sucks", "terrible", "awful", "horrible", "worst", "broken", "angry", "hate", 
        "fail", "failed", "useless", "scam", "trash", "garbage", "poor", "delayed", "delay", 
        "not received", "hasnt", "hasn't", "never received", "wrong information", "false promise",
        "stole", "stolen", "lost", "missing", "refund", "charged", "overcharged", "shameful"
    }
    
    for r in results:
        r["id"] = str(r.get("tweet_id", ""))
        r["_id"] = str(r.get("tweet_id", ""))
        inbound = bool(r.get("inbound", True))
        r["is_customer"] = inbound
        r["is_company_response"] = not inbound
        
        # Correctly normalize sentiment if text contains strong negative indicators
        raw_sentiment = str(r.get("sentiment", "neutral")).lower()
        msg_text = str(r.get("clean_text") or r.get("text") or "").lower()
        if any(neg in msg_text for neg in negative_indicators):
            r["sentiment"] = "negative"
        else:
            r["sentiment"] = raw_sentiment

        raw_kw = r.get("topic_keywords", "")
        r["topic_name"] = generate_cluster_name(raw_kw) if raw_kw else "Customer Support Inquiries"
    return results or []

def _generate_answer(query: str, documents: List[Dict[str, Any]]) -> str:
    if not query or not query.strip():
        return "Please enter a customer query."

    q_lower = query.lower().strip()
    words = [w for w in q_lower.split() if w.strip()]

    # Check for extremely vague single-word inputs that lack context
    common_short_intents = {"hi", "hello", "help", "thanks", "status", "summary", "kpi", "topics", "clusters", "reopen", "fcr"}
    if len(words) == 1 and len(q_lower) < 15 and q_lower not in common_short_intents:
        return f"Your query '{query.strip()}' is too brief to identify a specific customer issue. Could you please provide more context? (For example: 'Why are customers having issues with their {query.strip().lower()}?')."

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

    # 3. Intent: Specific Topic or Complaint Search with matched documents
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

    # 4. Search matched topics directly
    matching_topics = [t for t in topics if any(w in t.get("topic_keywords", "").lower() for w in q_lower.split() if len(w) > 3)]
    if matching_topics:
        t = matching_topics[0]
        name = generate_cluster_name(t.get("topic_keywords", ""))
        return (
            f"Found topic category **'{name}'** matching your query:\n"
            f"• Total Volume: {t.get('volume', 0):,} cases\n"
            f"• Negative Complaints: {t.get('negative_complaints', t.get('negative_volume', 0)):,}\n"
            f"• Average Response Time: {t.get('avg_response_time', 0.0):.1f} mins"
        )

    # 5. Out-of-domain or unrelated queries (Policy Steer-Back)
    return (
        "⚠️ **Topic Focus Policy: Voice-of-Customer Analytics**\n\n"
        "I specialize exclusively in **customer support telemetry, SLA response velocity, topic clustering, and operational governance**.\n\n"
        "I cannot assist with queries outside of customer support operations. Let's redirect our focus back to your active dataset (**105,000+ interactions**).\n\n"
        "💡 **Here are key operational areas we can analyze together right now:**\n"
        "1. 🚨 **Root-Cause Analysis**: *\"Why are customers experiencing delivery issues?\"*\n"
        "2. ⏱️ **SLA Diagnostics**: *\"What is our average SLA response time and reopen rate?\"*\n"
        "3. 🔥 **Topic Friction Breakdown**: *\"What are the top P0 complaint categories in North America?\"*\n"
        "4. 📋 **Enforce Operational Policy**: *\"What SLA policy should we enforce for recurring issues?\"*"
    )

async def rag_response(query: str, documents: Optional[List[Dict[str, Any]]] = None, limit: int = 10) -> Dict[str, Any]:
    if not query or not query.strip():
        return {
            "query": query,
            "retrieved_count": 0,
            "answer": "Please enter a customer query.",
            "documents": [],
        }

    q_clean = query.strip()
    words = [w for w in q_clean.split() if w.strip()]
    common_short_intents = {"hi", "hello", "help", "thanks", "status", "summary", "kpi", "topics", "clusters", "reopen", "fcr"}
    if len(words) == 1 and len(q_clean) < 15 and q_clean.lower() not in common_short_intents:
        return {
            "query": query,
            "retrieved_count": 0,
            "answer": f"Your query '{q_clean}' is too brief to identify a specific customer issue. Could you please provide more context? (For example: 'Why are customers having issues with their {q_clean.lower()}?').",
            "documents": [],
        }

    from backend.rag.query_preprocessor import normalize_and_correct_query
    norm_res = normalize_and_correct_query(query)
    clean_query = norm_res["normalized_query"]

    # 1. Query Vector Search (Qdrant)
    retrieved = []
    try:
        from backend.rag.vector_search import VectorSearch, MIN_RELEVANCE_THRESHOLD
        searcher = VectorSearch()
        qdrant_docs = searcher.search(clean_query, limit=limit, min_relevance_threshold=MIN_RELEVANCE_THRESHOLD)
        if qdrant_docs:
            retrieved = _format_rag_results(qdrant_docs)
    except Exception:
        pass

    # 2. Augment / Fallback with PostgreSQL Lexical Engine to ensure full evidence depth
    if len(retrieved) < limit:
        needed = limit - len(retrieved)
        pg_docs = _postgres_text_search(clean_query, limit=needed + 5)
        seen_ids = {str(d.get("id") or d.get("tweet_id")) for d in retrieved}
        for d in pg_docs:
            d_id = str(d.get("id") or d.get("tweet_id"))
            if d_id not in seen_ids:
                seen_ids.add(d_id)
                retrieved.append(d)
            if len(retrieved) >= limit:
                break

    if not retrieved and documents:
        q_lower = query.lower()
        retrieved = [doc for doc in documents if q_lower in str(doc.get("text", "")).lower()][:limit]

    return {
        "query": query,
        "retrieved_count": len(retrieved),
        "answer": _generate_answer(query, retrieved),
        "documents": retrieved,
    }
