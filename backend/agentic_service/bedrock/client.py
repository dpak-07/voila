import json
import os
import time
from typing import Any

from backend.config.settings import settings as backend_settings
from backend.agentic_service.bedrock.model import BedrockResponseModel
from backend.agentic_service.config import get_settings

BEDROCK_SYSTEM_PROMPT = """You are Voilà Copilot — a Voice-of-Customer AI analytics companion with DIRECT access to an operational database of customer support conversations.

YOUR CORE RULES:
1. GROUNDED DATA ONLY: The user question is accompanied by VALIDATED_DATABASE_TELEMETRY. All numbers and metrics provided in telemetry are factual measurements. Cite them accurately.
2. ENTITY ACCURACY & ZERO HALLUCINATION: If the user asks about a specific product, brand, keyword, or entity (e.g. "coke", "playstation", "flights", etc.) that does NOT appear in VALIDATED_DATABASE_TELEMETRY or sample quotes, explicitly state that no customer conversations were found for that entity in the dataset, and instead provide the actual top complaint categories from the telemetry. NEVER fabricate fake customer quotes or imaginary scenarios.
3. OFF-TOPIC / CASUAL QUERIES: If the user query is personal or unrelated to customer support telemetry, politely clarify your role as a VoC analytics partner and suggest relevant support metrics.
4. CONCISE & PROFESSIONAL: Answer directly with specific numbers and 1-2 sentences of actionable operational context. Avoid filler.
"""


class BedrockClient:
    """Thin Bedrock adapter with reliable deterministic grounded fallback synthesis."""

    _circuit_open_until = 0

    def __init__(self, model_id: str | None = None, use_mock: bool | None = None) -> None:
        settings = get_settings()
        self.model_id = model_id or settings.bedrock_model_id
        # Fast local synthesis mode enabled by default when in development or offline
        self.use_mock = True if use_mock is True or settings.use_bedrock_mock else False
        self.aws_region = settings.aws_region

    def generate_response(self, question: str, context: dict[str, Any]) -> BedrockResponseModel:
        now = time.time()
        if self.use_mock or not backend_settings.aws_bearer_token_bedrock or now < BedrockClient._circuit_open_until:
            return BedrockResponseModel(
                text=self._mock_response(question, context),
                model_id=self.model_id,
                used_mock=True,
            )
        try:
            resp_text = self._invoke_bedrock(question, context)
            if resp_text and resp_text.strip():
                return BedrockResponseModel(text=resp_text, model_id=self.model_id, used_mock=False)
        except Exception as e:
            BedrockClient._circuit_open_until = time.time() + 300
            print(f"[Bedrock Invocation Fallback to Grounded Synthesis]: {e}", flush=True)

        return BedrockResponseModel(
            text=self._mock_response(question, context),
            model_id=self.model_id,
            used_mock=True,
        )

    def _mock_response(self, question: str, context: dict[str, Any]) -> str:
        q = (question or "").strip()
        q_lower = q.lower()
        words = [w for w in q_lower.split() if w.strip()]

        if not q:
            return "Please type a customer support question or metric you'd like to explore."

        q_clean = q_lower.strip("!?,.:;\"'() \t\n")
        common_conversational = {"hi", "hello", "hey", "help", "thanks", "thank", "ok", "okay", "bye", "who", "what", "sup", "howdy", "thx", "cool", "nice", "great", "awesome"}
        if len(words) == 1 and len(q_clean) < 15 and q_clean not in common_conversational:
            return f"Your query '{q}' is a bit brief. Could you tell me a little more? (For example: \"Why are customers having issues with {q_clean}?\" or \"What is our SLA response time?\")."

        if any(term in q_lower for term in ["who are you", "what are you", "your name", "introduce yourself", "tell me about yourself", "what can you do", "what is voila"]):
            return (
                "I am **Voila Copilot**, your Voice-of-Customer AI analytics companion.\n\n"
                "I analyze customer support operations including:\n"
                "- Root-Cause Analysis: Why customers experience friction across complaint clusters.\n"
                "- SLA & Velocity Diagnostics: Response times, bottleneck queues, and First Contact Resolution.\n"
                "- Resolution & CSAT Tracking: Customer sentiment and trends across regions.\n\n"
                "Ask me anything about your customer support data."
            )

        if any(term in q_lower for term in ["thank you", "thanks", "thx", "good job", "awesome", "great work", "appreciate"]):
            return "You're welcome! Let me know if you'd like to explore any support trends or metrics."

        if q_lower in {"ok", "okay", "cool", "got it", "understood", "sure", "alright", "nice", "fine", "yep", "yes", "sounds good"}:
            return "Feel free to ask another question whenever you're ready."

        if any(term in q_lower for term in ["how are you", "how are you doing", "how r u", "how do you do"]):
            return "I'm doing well, thank you! Ready to help you analyze your customer support data. How can I assist?"

        if len(words) <= 3 and any(w in words for w in ["hi", "hello", "hey", "howdy", "greetings", "morning", "afternoon", "evening"]):
            return "Hello! I'm Voila Copilot. How can I help you explore your customer support data?"

        # Extract all available data from context
        analytics = context.get("analytics", {}) or {}
        nlp = context.get("nlp", {}) or {}
        vector_db = context.get("vector_db", {}) or {}
        customer_context = context.get("customer_context", []) or []
        sample_conversations = context.get("sample_conversations", []) or []

        # Handle both flat tool-result structure and nested kpi_metrics structure
        kpis = analytics.get("kpi_metrics") or analytics.get("kpis") or {}
        if not kpis and isinstance(analytics.get("kpi_summary"), dict):
            kpis = analytics["kpi_summary"].get("kpi_summary", analytics["kpi_summary"])
        if not kpis:
            # Try to extract from flat tool results
            kpi_data = analytics.get("kpi_summary", {})
            if isinstance(kpi_data, dict):
                kpis = kpi_data.get("kpi_summary", kpi_data)

        tot_conv = kpis.get("total_conversations") or kpis.get("total_records")
        res_rate = kpis.get("resolution_rate")
        reopen_rate = kpis.get("reopen_rate")
        resp_time = kpis.get("avg_response_time_minutes")
        neg_pct = kpis.get("negative_sentiment_percentage")
        esc_rate = kpis.get("escalation_rate")
        csat = kpis.get("csat_proxy")
        pos_pct = kpis.get("positive_sentiment_percentage")

        # Gather topics from multiple possible locations
        topics = (
            analytics.get("topic_clusters")
            or analytics.get("customer_pain_points")
            or analytics.get("topic_summaries")
            or nlp.get("active_clusters")
            or nlp.get("top_pain_points")
            or nlp.get("topics")
            or []
        )

        recommendations = analytics.get("recommendations", [])
        root_causes = analytics.get("root_cause_analysis", [])
        priorities = analytics.get("priorities", [])
        trends = analytics.get("trends", {})
        emerging = analytics.get("emerging_issues", [])
        recurring = analytics.get("recurring_issues", [])

        has_grounded_docs = bool(customer_context or sample_conversations or (isinstance(vector_db, dict) and (vector_db.get("results") or vector_db.get("documents"))))
        has_data = bool(tot_conv and tot_conv > 0)

        if not has_data and not has_grounded_docs:
            return (
                "I don't have enough data to answer that yet. The dataset may be empty or still loading.\n\n"
                "Try uploading a customer support CSV/Parquet on the **Upload** page, then ask again."
            )

        # Dynamic response generation based on actual query intent
        lines = []

        # Detect query intent — use phrase-level matching to avoid false positives
        # Each flag requires the query to clearly be ABOUT that specific topic
        asking_response_time = any(k in q_lower for k in ["response time", "sla", "wait time", "latency", "how long does", "turnaround time", "first response"])
        asking_resolution = any(k in q_lower for k in ["resolution rate", "resolved", "fcr", "first contact resolution", "resolve rate"])
        asking_reopen = any(k in q_lower for k in ["reopen rate", "reopened", "reopen", "repeat contact"])
        asking_sentiment = any(k in q_lower for k in ["sentiment", "negative sentiment", "positive sentiment", "csat", "satisfaction score", "customer satisfaction", "unhappy", "happy customers"])
        asking_topics = any(k in q_lower for k in ["top complaint", "complaint categor", "pain point", "top issue", "top problem", "what are the main", "top topics", "topic cluster", "complaint breakdown"])
        asking_escalation = any(k in q_lower for k in ["escalation rate", "escalated", "escalation", "manager intervention", "tier-2", "tier 2"])
        asking_dashboard = any(k in q_lower for k in ["dashboard", "executive summary", "overview", "all kpi", "show kpi", "show metric", "key performance"])
        asking_why = any(k in q_lower for k in ["why are", "why is", "root cause", "what causes", "what is causing", "reason for"])
        asking_recommend = any(k in q_lower for k in ["recommend", "suggestion", "action plan", "how to fix", "how to improve", "intervention", "prioritiz"])
        asking_trends = any(k in q_lower for k in ["trend", "trending", "emerging", "spike", "anomaly", "growing issue", "increasing issue"])
        asking_volume = any(k in q_lower for k in ["volume", "how many conversation", "total conversation", "number of"])
        asking_company = any(k in q_lower for k in ["which company", "which brand", "company breakdown", "brand breakdown", "by company", "by brand"])

        # Determine primary intent — only ONE section should dominate
        primary_intent = None
        if asking_escalation:
            primary_intent = "escalation"
        elif asking_response_time:
            primary_intent = "response_time"
        elif asking_resolution:
            primary_intent = "resolution"
        elif asking_reopen:
            primary_intent = "reopen"
        elif asking_sentiment:
            primary_intent = "sentiment"
        elif asking_topics:
            primary_intent = "topics"
        elif asking_why:
            primary_intent = "why"
        elif asking_recommend:
            primary_intent = "recommend"
        elif asking_trends:
            primary_intent = "trends"
        elif asking_volume:
            primary_intent = "volume"
        elif asking_company:
            primary_intent = "company"
        elif asking_dashboard:
            primary_intent = "dashboard"

        # Build response — ONLY the relevant section, not all of them
        # Section 1: Scale context — only for dashboard/overview queries
        if primary_intent == "dashboard" and tot_conv:
            scope_parts = [f"Across **{tot_conv:,} customer interactions**"]
            if kpis.get("company"):
                scope_parts[0] += f" for **{kpis['company']}**"
            lines.append(scope_parts[0] + ":")

        # Section 2: Direct answer based on primary intent (only ONE)
        if primary_intent == "response_time" and resp_time is not None:
            lines.append(f"**Average Response Time**: {resp_time:.1f} minutes")
            if resp_time <= 15:
                lines.append("Response velocity is within the target SLA window.")
            elif resp_time <= 60:
                lines.append("Response times are within acceptable operational range.")
            else:
                lines.append("Response latency is elevated — consider triage queue optimization.")

        elif primary_intent == "resolution" and res_rate is not None:
            lines.append(f"**Resolution Rate (FCR)**: {res_rate:.1f}%")
            if res_rate >= 80:
                lines.append("Strong first-contact resolution performance.")
            elif res_rate >= 60:
                lines.append("Resolution rate is moderate — room for improvement in first-contact resolution.")
            else:
                lines.append("Resolution rate is below target — investigate agent training and macro availability.")

        elif primary_intent == "reopen" and reopen_rate is not None:
            lines.append(f"**Reopen Rate**: {reopen_rate:.1f}%")
            if reopen_rate <= 10:
                lines.append("Low reopen rate indicates solid resolution quality.")
            else:
                lines.append("Elevated reopen rate suggests premature ticket closure or incomplete resolution.")

        elif primary_intent == "sentiment":
            if neg_pct is not None:
                lines.append(f"**Negative Sentiment**: {neg_pct:.1f}%")
            if pos_pct is not None:
                lines.append(f"**Positive Sentiment**: {pos_pct:.1f}%")
            if csat is not None:
                lines.append(f"**CSAT Proxy**: {csat:.1f}%")
            if not lines:
                lines.append("Sentiment data not available for current filters.")

        elif primary_intent == "escalation" and esc_rate is not None:
            lines.append(f"**Escalation Rate**: {esc_rate:.1f}%")
            if esc_rate <= 5:
                lines.append("Escalation rate is well-controlled.")
            else:
                lines.append("Escalation rate is elevated — review tier-1 agent empowerment and decision trees.")

        elif primary_intent == "volume" and tot_conv:
            lines.append(f"**Total Conversation Volume**: {tot_conv:,}")

        elif primary_intent == "topics" and isinstance(topics, list) and topics:
            lines.append("**Top Complaint Categories**:")
            for idx, t in enumerate(topics[:5], 1):
                if isinstance(t, dict):
                    name = t.get("cluster_name") or t.get("topic_keywords") or t.get("name") or f"Topic #{idx}"
                    vol = t.get("volume") or t.get("count") or 0
                    neg_rate_val = t.get("negative_sentiment_percentage")
                    if neg_rate_val is None and vol > 0 and t.get("negative_complaints"):
                        neg_rate_val = round(t["negative_complaints"] / vol * 100, 1)
                    extra = f" ({neg_rate_val:.1f}% negative)" if neg_rate_val is not None else ""
                    lines.append(f"{idx}. **{name}** — {vol:,} conversations{extra}")
                else:
                    lines.append(f"{idx}. **{t}**")

        elif primary_intent == "why":
            if root_causes:
                lines.append("**Root Cause Analysis**:")
                for idx, rc in enumerate(root_causes[:3], 1):
                    if isinstance(rc, dict):
                        issue = rc.get("issue") or rc.get("cluster_name") or f"Issue #{idx}"
                        cause = rc.get("likely_root_cause") or rc.get("root_cause") or ""
                        vol = rc.get("volume", 0)
                        lines.append(f"{idx}. **{issue}** ({vol:,} cases)")
                        if cause:
                            lines.append(f"   {cause}")
            elif topics:
                lines.append("**Top Friction Drivers**:")
                for idx, t in enumerate(topics[:3], 1):
                    if isinstance(t, dict):
                        name = t.get("cluster_name") or t.get("topic_keywords") or f"Topic #{idx}"
                        vol = t.get("volume") or 0
                        neg_r = t.get("negative_sentiment_percentage")
                        extra = f" with {neg_r:.1f}% negative tone" if neg_r is not None else ""
                        lines.append(f"{idx}. **{name}** — {vol:,} conversations{extra}")

        elif primary_intent == "recommend" and recommendations:
            lines.append("**Recommended Interventions**:")
            for idx, rec in enumerate(recommendations[:3], 1):
                if isinstance(rec, dict):
                    issue = rec.get("issue", "")
                    action = rec.get("action", "")
                    owner = rec.get("owner", "")
                    impact = rec.get("impact", "")
                    lines.append(f"{idx}. **{impact}** — {action}")
                    if owner:
                        lines.append(f"   Owner: {owner}")

        elif primary_intent == "trends":
            if emerging:
                lines.append("**Emerging Issues**:")
                for idx, e in enumerate(emerging[:3], 1):
                    if isinstance(e, dict):
                        name = e.get("cluster_name") or e.get("topic_keywords") or f"Issue #{idx}"
                        vol = e.get("volume", 0)
                        lines.append(f"{idx}. **{name}** — {vol:,} conversations")
            elif topics:
                lines.append("**Active Topic Clusters**:")
                for idx, t in enumerate(topics[:3], 1):
                    if isinstance(t, dict):
                        name = t.get("cluster_name") or f"Topic #{idx}"
                        vol = t.get("volume", 0)
                        lines.append(f"{idx}. **{name}** — {vol:,} conversations")

        elif primary_intent == "company":
            companies = analytics.get("company_breakdown") or []
            if isinstance(companies, list) and companies:
                lines.append("**Company Breakdown**:")
                for idx, c in enumerate(companies[:5], 1):
                    if isinstance(c, dict):
                        name = c.get("company") or c.get("brand") or f"Company #{idx}"
                        vol = c.get("volume") or c.get("count") or 0
                        lines.append(f"{idx}. **{name}** — {vol:,} conversations")

        elif primary_intent == "dashboard":
            if tot_conv:
                stat_bullets = []
                if res_rate is not None:
                    stat_bullets.append(f"- Resolution Rate: **{res_rate:.1f}%**")
                if resp_time is not None:
                    stat_bullets.append(f"- Average Response Time: **{resp_time:.1f} minutes**")
                if reopen_rate is not None:
                    stat_bullets.append(f"- Reopen Rate: **{reopen_rate:.1f}%**")
                if esc_rate is not None:
                    stat_bullets.append(f"- Escalation Rate: **{esc_rate:.1f}%**")
                if neg_pct is not None:
                    stat_bullets.append(f"- Negative Sentiment: **{neg_pct:.1f}%**")
                if pos_pct is not None:
                    stat_bullets.append(f"- Positive Sentiment: **{pos_pct:.1f}%**")
                if stat_bullets:
                    lines.append("\n".join(stat_bullets))

                if topics and isinstance(topics, list):
                    top3 = topics[:3]
                    if top3:
                        lines.append("\n**Top Complaint Drivers**:")
                        for idx, t in enumerate(top3, 1):
                            if isinstance(t, dict):
                                name = t.get("cluster_name") or t.get("topic_keywords") or f"Topic #{idx}"
                                vol = t.get("volume", 0)
                                lines.append(f"{idx}. {name} ({vol:,} cases)")

        if lines:
            return "\n".join(lines)

        # Final fallback: try to provide any available data
        if tot_conv:
            return f"Based on {tot_conv:,} customer conversations. Could you clarify what specific metric or topic you'd like to explore?"
        return "I couldn't find specific data for that query. Try asking about response times, resolution rates, sentiment, or complaint topics."

    def _invoke_bedrock(self, question: str, context: dict[str, Any]) -> str:
        import base64
        import requests

        token = backend_settings.aws_bearer_token_bedrock
        is_mantle = False
        if token:
            try:
                if token.startswith("ABSK"):
                    decoded = base64.b64decode(token[4:]).decode('utf-8', errors='ignore')
                else:
                    decoded = base64.b64decode(token).decode('utf-8', errors='ignore')
                if "MantleApiKey-" in decoded:
                    is_mantle = True
            except Exception:
                pass

        if is_mantle:
            mantle_region = "us-east-1" if self.aws_region in ["ap-south-1", None, ""] else self.aws_region
            url = f"https://bedrock-mantle.{mantle_region}.api.aws/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            # Format context as a structured report the LLM can easily parse
            analytics = context.get("analytics", {}) if isinstance(context, dict) else {}
            kpis = analytics.get("kpi_metrics") or analytics.get("kpis") or {}
            topics = analytics.get("topic_clusters") or analytics.get("topic_summaries") or analytics.get("customer_pain_points") or []
            quotes = context.get("customer_context") or []
            recommendations = analytics.get("recommendations", []) or []

            # Build a human-readable validated context block
            context_lines = ["=== VALIDATED_DATABASE_TELEMETRY ==="]
            context_lines.append(f"Total Conversations: {kpis.get('total_conversations', kpis.get('total_records', 'N/A'))}")
            context_lines.append(f"Resolution Rate: {kpis.get('resolution_rate', 'N/A')}%")
            context_lines.append(f"Escalation Rate: {kpis.get('escalation_rate', 'N/A')}%")
            context_lines.append(f"Reopen Rate: {kpis.get('reopen_rate', 'N/A')}%")
            context_lines.append(f"Avg Response Time: {kpis.get('avg_response_time_minutes', 'N/A')} minutes")
            context_lines.append(f"Negative Sentiment: {kpis.get('negative_sentiment_percentage', 'N/A')}%")
            context_lines.append(f"Positive Sentiment: {kpis.get('positive_sentiment_percentage', 'N/A')}%")
            context_lines.append(f"CSAT Proxy: {kpis.get('csat_proxy', 'N/A')}%")
            if kpis.get("company"):
                context_lines.append(f"Company: {kpis['company']}")

            if isinstance(topics, list) and topics:
                context_lines.append("\nTOP_COMPLAINT_CLUSTERS:")
                for idx, t in enumerate(topics[:5], 1):
                    if isinstance(t, dict):
                        name = t.get("cluster_name") or t.get("topic_keywords") or f"Topic #{idx}"
                        vol = t.get("volume", 0)
                        neg = t.get("negative_sentiment_percentage")
                        neg_str = f", {neg:.1f}% negative" if neg is not None else ""
                        context_lines.append(f"  {idx}. {name}: {vol:,} conversations{neg_str}")

            if isinstance(recommendations, list) and recommendations:
                context_lines.append("\nRECOMMENDATIONS:")
                for idx, r in enumerate(recommendations[:3], 1):
                    if isinstance(r, dict):
                        action = r.get("action", "")
                        owner = r.get("owner", "")
                        context_lines.append(f"  {idx}. [{owner}] {action}")

            if isinstance(quotes, list) and quotes:
                context_lines.append("\nSAMPLE_CUSTOMER_QUOTES:")
                for q in quotes[:3]:
                    text = q if isinstance(q, str) else str(q)
                    context_lines.append(f'  "{text[:200]}"')

            context_lines.append("=== END_TELEMETRY ===")
            context_block = "\n".join(context_lines)
            
            payload = {
                "model": self.model_id,
                "messages": [
                    {"role": "system", "content": BEDROCK_SYSTEM_PROMPT},
                    {"role": "user", "content": f"USER_QUESTION: {question}\n\n{context_block}"}
                ],
                "max_tokens": 600
            }
            response = requests.post(url, headers=headers, json=payload, timeout=8.0)
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                raise Exception(f"Mantle API error: {response.text}")

        # Fallback to standard Bedrock Runtime
        import boto3
        if token:
            os.environ["AWS_BEARER_TOKEN_BEDROCK"] = token

        # Format context as structured report
        analytics = context.get("analytics", {}) if isinstance(context, dict) else {}
        kpis = analytics.get("kpi_metrics") or analytics.get("kpis") or {}
        topics = analytics.get("topic_clusters") or analytics.get("topic_summaries") or analytics.get("customer_pain_points") or []
        quotes = context.get("customer_context") or []
        recommendations = analytics.get("recommendations", []) or []

        context_lines = ["=== VALIDATED_DATABASE_TELEMETRY ==="]
        context_lines.append(f"Total Conversations: {kpis.get('total_conversations', kpis.get('total_records', 'N/A'))}")
        context_lines.append(f"Resolution Rate: {kpis.get('resolution_rate', 'N/A')}%")
        context_lines.append(f"Escalation Rate: {kpis.get('escalation_rate', 'N/A')}%")
        context_lines.append(f"Reopen Rate: {kpis.get('reopen_rate', 'N/A')}%")
        context_lines.append(f"Avg Response Time: {kpis.get('avg_response_time_minutes', 'N/A')} minutes")
        context_lines.append(f"Negative Sentiment: {kpis.get('negative_sentiment_percentage', 'N/A')}%")
        context_lines.append(f"Positive Sentiment: {kpis.get('positive_sentiment_percentage', 'N/A')}%")
        context_lines.append(f"CSAT Proxy: {kpis.get('csat_proxy', 'N/A')}%")
        if kpis.get("company"):
            context_lines.append(f"Company: {kpis['company']}")

        if isinstance(topics, list) and topics:
            context_lines.append("\nTOP_COMPLAINT_CLUSTERS:")
            for idx, t in enumerate(topics[:5], 1):
                if isinstance(t, dict):
                    name = t.get("cluster_name") or t.get("topic_keywords") or f"Topic #{idx}"
                    vol = t.get("volume", 0)
                    neg = t.get("negative_sentiment_percentage")
                    neg_str = f", {neg:.1f}% negative" if neg is not None else ""
                    context_lines.append(f"  {idx}. {name}: {vol:,} conversations{neg_str}")

        if isinstance(recommendations, list) and recommendations:
            context_lines.append("\nRECOMMENDATIONS:")
            for idx, r in enumerate(recommendations[:3], 1):
                if isinstance(r, dict):
                    action = r.get("action", "")
                    owner = r.get("owner", "")
                    context_lines.append(f"  {idx}. [{owner}] {action}")

        if isinstance(quotes, list) and quotes:
            context_lines.append("\nSAMPLE_CUSTOMER_QUOTES:")
            for q in quotes[:3]:
                text = q if isinstance(q, str) else str(q)
                context_lines.append(f'  "{text[:200]}"')

        context_lines.append("=== END_TELEMETRY ===")
        context_block = "\n".join(context_lines)

        client = boto3.client("bedrock-runtime", region_name=self.aws_region or "us-east-1")
        system_prompts = [{"text": BEDROCK_SYSTEM_PROMPT}]
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "text": f"USER_QUESTION: {question}\n\n{context_block}",
                    }
                ],
            }
        ]
        
        response = client.converse(
            modelId=self.model_id,
            messages=messages,
            system=system_prompts,
            inferenceConfig={"maxTokens": 600}
        )
        
        output = response.get("output", {})
        message = output.get("message", {})
        content = message.get("content", [])
        if content and "text" in content[0]:
            return content[0]["text"]
        return ""
