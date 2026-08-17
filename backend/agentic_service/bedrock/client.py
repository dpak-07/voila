import json
import os
import time
from typing import Any

from backend.config.settings import settings as backend_settings
from backend.agentic_service.bedrock.model import BedrockResponseModel
from backend.agentic_service.config import get_settings

BEDROCK_SYSTEM_PROMPT = """You are Voila Copilot, a friendly, warm, empathetic, and insightful Voice-of-Customer (VoC) AI analytics companion!

YOUR PERSONALITY & TONE:
1. WARM & APPROACHABLE: Use a friendly, collaborative conversational style.
2. EMPATHETIC & SOLUTION-ORIENTED: When discussing customer pain points, demonstrate active empathy and focus on constructive solutions.
3. CLEAR & ACCESSIBLE: Explain metrics in clean, easy-to-understand language.
4. ACCURATE & GROUNDED: Keep all statistics faithful to the validated database telemetry. Never invent data.
5. CONCISE & PRECISE: Answer ONLY what was asked. Do not volunteer extra data, extra KPIs, or extra suggestions unless explicitly requested.

HANDLING OFF-TOPIC CONVERSATIONS:
- General or Off-topic queries: Respond briefly, explain your primary focus is customer support analytics, and suggest relevant support topics.
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

        # 1. Autonomous Empty Query Handling
        if not q:
            return "Please type a customer support question or metric you'd like to explore."

        # 2. Autonomous Vague Single-Word Handling
        q_clean = q_lower.strip("!?,.:;\"'() \t\n")
        common_conversational = {"hi", "hello", "hey", "help", "thanks", "thank", "ok", "okay", "bye", "who", "what", "sup", "howdy", "thx", "cool", "nice", "great", "awesome"}
        if len(words) == 1 and len(q_clean) < 15 and q_clean not in common_conversational:
            return f"Your query '{q}' is a bit brief. Could you tell me a little more? (For example: \"Why are customers having issues with {q_clean}?\" or \"What is our SLA response time?\")."

        # 3. Autonomous Persona & Identity Reasoning
        if any(term in q_lower for term in ["who are you", "what are you", "your name", "introduce yourself", "tell me about yourself", "what can you do", "what is voila"]):
            return (
                "I am **Voila Copilot**, your Voice-of-Customer AI analytics companion.\n\n"
                "I analyze customer support operations including:\n"
                "- Root-Cause Analysis: Why customers experience friction across complaint clusters.\n"
                "- SLA & Velocity Diagnostics: Response times, bottleneck queues, and First Contact Resolution.\n"
                "- Resolution & CSAT Tracking: Customer sentiment and trends across regions.\n\n"
                "Ask me anything about your customer support data."
            )

        # 4. Autonomous Conversational Politeness Reasoning
        if any(term in q_lower for term in ["thank you", "thanks", "thx", "good job", "awesome", "great work", "appreciate"]):
            return "You're welcome! Let me know if you'd like to explore any support trends or metrics."

        if q_lower in {"ok", "okay", "cool", "got it", "understood", "sure", "alright", "nice", "fine", "yep", "yes", "sounds good"}:
            return "Feel free to ask another question whenever you're ready."

        if any(term in q_lower for term in ["how are you", "how are you doing", "how r u", "how do you do"]):
            return "I'm doing well, thank you! Ready to help you analyze your customer support data. How can I assist?"

        if len(words) <= 3 and any(w in words for w in ["hi", "hello", "hey", "howdy", "greetings", "morning", "afternoon", "evening"]):
            return "Hello! I'm Voila Copilot. How can I help you explore your customer support data?"

        # Extract structured metric evidence if present
        analytics = context.get("analytics", {}) or {}
        nlp = context.get("nlp", {}) or {}
        vector_db = context.get("vector_db", {}) or {}
        customer_context = context.get("customer_context", []) or []

        kpis = analytics.get("kpi_metrics") or analytics.get("kpis") or analytics or {}
        tot_conv = kpis.get("total_conversations") or kpis.get("total_records")
        res_rate = kpis.get("resolution_rate")
        reopen_rate = kpis.get("reopen_rate")
        resp_time = kpis.get("avg_response_time_minutes")
        neg_pct = kpis.get("negative_sentiment_percentage")

        # 5. Autonomous LLM & Agentic Relevance Evaluation & Steer-Back Policy
        has_grounded_docs = bool(customer_context or (isinstance(vector_db, dict) and (vector_db.get("results") or vector_db.get("documents"))))
        has_analytics_intent = any(k in q_lower for k in [
            "kpi", "sla", "metric", "dashboard", "summary", "response", "resolution", "reopen", 
            "fcr", "sentiment", "trend", "volume", "rate", "agent", "queue", "policy", "baseline", 
            "performance", "issue", "problem", "critical", "p0", "p1", "p2", "top", "complaint", 
            "pain", "friction", "crash", "error", "bug", "support", "customer", "why", "what", "how",
            "explain", "show", "tell", "analyze", "find", "billing", "delivery", "app"
        ])

        if not has_grounded_docs and not has_analytics_intent:
            return (
                "I focus on analyzing customer support operations, SLA metrics, and topic clustering. "
                "Try asking about response times, resolution rates, complaint topics, or sentiment trends."
            )

        # 6. Query-Type-Aware Response — only answer what was asked
        lines = []

        # Determine what the user is asking about
        asking_response_time = any(k in q_lower for k in ["response time", "sla", "wait", "latency", "speed"])
        asking_resolution = any(k in q_lower for k in ["resolution", "resolve", "solved", "fcr", "first contact"])
        asking_reopen = any(k in q_lower for k in ["reopen", "reopened"])
        asking_sentiment = any(k in q_lower for k in ["sentiment", "negative", "positive", "csat", "satisfaction"])
        asking_topics = any(k in q_lower for k in ["topic", "cluster", "complaint", "pain", "problem", "billing", "delivery", "crash", "bug", "issue", "what are", "top"])
        asking_escalation = any(k in q_lower for k in ["escalation", "escalat", "critical", "urgent", "p0", "p1"])
        asking_dashboard = any(k in q_lower for k in ["dashboard", "summary", "overview", "metrics", "kpi", "executive"])
        asking_general = not (asking_response_time or asking_resolution or asking_reopen or asking_sentiment or asking_topics or asking_escalation or asking_dashboard)

        # Response Time
        if asking_response_time and resp_time is not None:
            lines.append(f"Average response time: **{resp_time:.1f} minutes**.")
            if tot_conv:
                lines.append(f"Based on {tot_conv:,} customer interactions.")
            return "\n".join(lines)

        # Resolution Rate
        if asking_resolution and res_rate is not None:
            lines.append(f"Resolution rate: **{res_rate:.1f}%**.")
            if tot_conv:
                lines.append(f"Based on {tot_conv:,} customer interactions.")
            return "\n".join(lines)

        # Reopen Rate
        if asking_reopen and reopen_rate is not None:
            lines.append(f"Reopen rate: **{reopen_rate:.1f}%**.")
            if tot_conv:
                lines.append(f"Based on {tot_conv:,} customer interactions.")
            return "\n".join(lines)

        # Sentiment / CSAT
        if asking_sentiment:
            if neg_pct is not None:
                lines.append(f"Negative sentiment: **{neg_pct:.1f}%**.")
            if kpis.get("positive_sentiment_percentage") is not None:
                lines.append(f"Positive sentiment: **{kpis['positive_sentiment_percentage']:.1f}%**.")
            if kpis.get("csat_proxy") is not None:
                lines.append(f"CSAT proxy: **{kpis['csat_proxy']:.1f}%**.")
            return "\n".join(lines) if lines else "Sentiment data not available."

        # Topics / Pain Points
        if asking_topics:
            topics = (
                analytics.get("topic_clusters")
                or analytics.get("customer_pain_points")
                or analytics.get("topic_summaries")
                or nlp.get("topics")
                or []
            )
            if isinstance(topics, list) and topics:
                lines.append("Top complaint topics:")
                for idx, t in enumerate(topics[:3], 1):
                    if isinstance(t, dict):
                        name = t.get("cluster_name") or t.get("topic_keywords") or t.get("name") or f"Topic #{idx}"
                        vol = t.get("volume") or t.get("count") or 0
                        neg = t.get("negative_sentiment_pct") or t.get("negative_percentage")
                        extra = f" ({neg:.1f}% negative)" if neg is not None else ""
                        lines.append(f"{idx}. **{name}** ({vol:,} cases{extra})")
                return "\n".join(lines)
            return "Topic data not available."

        # Escalation / Priority
        if asking_escalation:
            priorities = analytics.get("priorities") or []
            if isinstance(priorities, list) and priorities:
                lines.append("Priority issues:")
                for idx, p in enumerate(priorities[:3], 1):
                    if isinstance(p, dict):
                        name = p.get("cluster_name") or p.get("issue") or f"Issue #{idx}"
                        vol = p.get("volume") or 0
                        lines.append(f"{idx}. **{name}** ({vol:,} cases)")
                return "\n".join(lines)
            return "Priority data not available."

        # Dashboard / Summary / KPIs
        if asking_dashboard or asking_general:
            if tot_conv is not None:
                lines.append(f"Across **{tot_conv:,} customer interactions**:")
                stat_bullets = []
                if res_rate is not None:
                    stat_bullets.append(f"- Resolution Rate: {res_rate:.1f}%")
                if resp_time is not None:
                    stat_bullets.append(f"- Average Response Time: {resp_time:.1f} minutes")
                if reopen_rate is not None:
                    stat_bullets.append(f"- Reopen Rate: {reopen_rate:.1f}%")
                if neg_pct is not None:
                    stat_bullets.append(f"- Negative Sentiment: {neg_pct:.1f}%")
                if stat_bullets:
                    lines.append("\n".join(stat_bullets))
                return "\n".join(lines) if lines else "No summary data available."

        # Fallback
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
            
            # High-density compact context for fast LLM inference (sub-2s)
            analytics = context.get("analytics", {}) if isinstance(context, dict) else {}
            kpis = analytics.get("kpi_metrics") or analytics.get("kpis") or analytics
            topics = analytics.get("topic_clusters") or analytics.get("topic_summaries") or analytics.get("customer_pain_points") or []
            quotes = context.get("customer_context") or []
            prompt_context = {
                "kpis": kpis,
                "top_topics": topics[:5] if isinstance(topics, list) else topics,
                "customer_quotes": quotes[:3] if isinstance(quotes, list) else quotes,
                "recommendations": analytics.get("recommendations", [])[:3] if isinstance(analytics, dict) else []
            }
            
            payload = {
                "model": self.model_id,
                "messages": [
                    {"role": "system", "content": BEDROCK_SYSTEM_PROMPT},
                    {"role": "user", "content": json.dumps({"question": question, "validated_context": prompt_context})}
                ],
                "max_tokens": 800
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

        client = boto3.client("bedrock-runtime", region_name=self.aws_region or "us-east-1")
        system_prompts = [{"text": BEDROCK_SYSTEM_PROMPT}]
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "text": json.dumps({"question": question, "validated_context": context}),
                    }
                ],
            }
        ]
        
        response = client.converse(
            modelId=self.model_id,
            messages=messages,
            system=system_prompts,
            inferenceConfig={"maxTokens": 800}
        )
        
        output = response.get("output", {})
        message = output.get("message", {})
        content = message.get("content", [])
        if content and "text" in content[0]:
            return content[0]["text"]
        return ""
