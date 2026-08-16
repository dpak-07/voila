import json
import os
import time
from typing import Any

from backend.config.settings import settings as backend_settings
from backend.agentic_service.bedrock.model import BedrockResponseModel
from backend.agentic_service.config import get_settings

BEDROCK_SYSTEM_PROMPT = """You are Voilà Copilot, a friendly, warm, empathetic, and insightful Voice-of-Customer (VoC) AI analytics companion! 😊✨

YOUR PERSONALITY & TONE:
1. WARM, ENTHUSIASTIC & APPROACHABLE: Greet the user cheerfully (e.g. "Hey there! 😊", "Great question!"). Use a friendly, collaborative conversational style with tasteful emojis (📊, 💡, 🚀, ✨, 👍, 🎯) to make data and operational insights engaging and pleasant to read.
2. EMPATHETIC & SOLUTION-ORIENTED: When discussing customer pain points, escalations, or support friction, demonstrate active empathy and focus on constructive, high-impact solutions.
3. CLEAR & ACCESSIBLE: Explain telemetry, SLA response metrics, FCR, and topic clusters in clean, easy-to-understand language. Avoid cold or overly stiff robotic jargon.
4. ACCURATE & STRICTLY GROUNDED: Keep all statistics, volume figures, resolution rates, and facts 100% faithful to the validated database telemetry provided. Never invent data.
5. PROACTIVE & HELPFUL: At the end of your response, always offer 2-3 friendly, concrete follow-up suggestions or next areas you can explore together!

HANDLING CASUAL & OFF-TOPIC CONVERSATIONS:
- Greetings & Politeness (e.g., "hi", "how are you?", "thanks", "who are you?"): Reply warmly with a cheerful, human-friendly greeting and invite them to explore their support metrics!
- General or Off-topic queries: Respond kindly with a smile, explain gently that your primary superpower is analyzing customer support operations and metrics, and offer friendly suggestions on support topics to explore together.
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
            return "Hey there! 😊 Please type any customer support question or metric you'd like to explore!"

        # 2. Autonomous Vague Single-Word Handling
        q_clean = q_lower.strip("!?,.:;\"'() \t\n")
        common_conversational = {"hi", "hello", "hey", "help", "thanks", "thank", "ok", "okay", "bye", "who", "what", "sup", "howdy", "thx", "cool", "nice", "great", "awesome"}
        if len(words) == 1 and len(q_clean) < 15 and q_clean not in common_conversational:
            return f"Hey! 😊 Your query '{q}' is a bit brief. Could you tell me a little more? (For example: *\"Why are customers having issues with {q_clean}?\"* or *\"What is our SLA response time?\"*)."

        # 3. Autonomous Persona & Identity Reasoning
        if any(term in q_lower for term in ["who are you", "what are you", "your name", "introduce yourself", "tell me about yourself", "what can you do", "what is voila"]):
            return (
                "Hey there! 👋 I am **Voilà Copilot**, your friendly Voice-of-Customer AI analytics companion! ✨\n\n"
                "I am connected to your live customer support database (**105,000+ interactions**) to help you easily uncover actionable insights with real-time sentiment, SLA, and topic clustering telemetry.\n\n"
                "Here is what we can do together:\n"
                "- 🚨 **Root-Cause Analysis**: Discover why customers are experiencing friction across key complaint clusters.\n"
                "- ⏱️ **SLA & Velocity Diagnostics**: Understand response times, bottleneck queues, and First Contact Resolution.\n"
                "- 📊 **Resolution & CSAT Tracking**: Track customer sentiment and trends across global regions.\n"
                "- 💡 **Actionable Playbooks**: Recommend high-impact improvements for Support, Engineering, and Product teams.\n\n"
                "Feel free to ask me anything about your customer support data!"
            )

        # 4. Autonomous Conversational Politeness Reasoning
        if any(term in q_lower for term in ["thank you", "thanks", "thx", "good job", "awesome", "great work", "appreciate"]):
            return "You're very welcome! 😊 Always happy to help! Let me know if you'd like to explore any other support trends, SLA metrics, or customer feedback clusters."

        if q_lower in {"ok", "okay", "cool", "got it", "understood", "sure", "alright", "nice", "fine", "yep", "yes", "sounds good"}:
            return "Awesome! 👍 Feel free to ask another question whenever you're ready, or let me know what topic you'd like to dive into next!"

        if any(term in q_lower for term in ["how are you", "how are you doing", "how r u", "how do you do"]):
            return "I'm doing fantastic, thank you for asking! 😊 Ready and excited to help you analyze your customer support operations and metrics. How can I assist you today?"

        if len(words) <= 3 and any(w in words for w in ["hi", "hello", "hey", "howdy", "greetings", "morning", "afternoon", "evening"]):
            return "Hey there! 👋 I'm **Voilà Copilot**, your friendly AI analytics partner. How can I help you explore your customer support data or team metrics today? 😊"

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
                "Hey there! 😊 While my primary superpowers are focused on analyzing **customer support operations, SLA response velocity, and topic clustering** across your 105,000+ dataset, I'd love to help you explore your support telemetry!\n\n"
                "💡 **Here are some great questions we could explore together:**\n"
                "1. 🚨 **Root-Cause Analysis**: *\"Why are customers experiencing poor support or delivery delays?\"*\n"
                "2. ⏱️ **SLA Diagnostic**: *\"What is our average SLA response time and First Contact Resolution?\"*\n"
                "3. 🔥 **Topic Friction**: *\"What are the top P0 complaint categories in North America?\"*\n"
                "4. 📋 **Actionable Playbooks**: *\"What operational policies should we enforce for recurring issues?\"*"
            )

        # 6. Structured Grounded Analytical Response
        lines = ["Hey there! 😊 Here is what our analysis reveals based on your live customer support data:\n"]

        if tot_conv is not None:
            lines.append(f"Across **{tot_conv:,} customer interactions** in your active dataset, here is the current operational baseline:")
            stat_bullets = []
            if res_rate is not None:
                stat_bullets.append(f"- 🎯 **Resolution Rate**: {res_rate:.1f}%")
            if resp_time is not None:
                stat_bullets.append(f"- ⏱️ **Average Response Time**: {resp_time:.1f} minutes")
            if reopen_rate is not None:
                stat_bullets.append(f"- 🔄 **Reopen Rate**: {reopen_rate:.1f}%")
            if neg_pct is not None:
                stat_bullets.append(f"- ⚠️ **Negative Friction Share**: {neg_pct:.1f}%")
            if stat_bullets:
                lines.append("\n".join(stat_bullets))
                lines.append("")

        # Top Topics / NLP Clusters
        topics = (
            analytics.get("topic_clusters")
            or analytics.get("customer_pain_points")
            or analytics.get("topic_summaries")
            or analytics.get("emerging_issues")
            or analytics.get("recurring_issues")
            or analytics.get("priorities")
            or nlp.get("topics")
            or []
        )
        if isinstance(topics, list) and topics:
            lines.append("🔥 **Top Critical Complaint Clusters & Themes:**")
            for idx, t in enumerate(topics[:3], 1):
                if isinstance(t, dict):
                    name = t.get("cluster_name") or t.get("topic_keywords") or t.get("name") or t.get("topic") or f"Topic #{idx}"
                    vol = t.get("volume") or t.get("count") or t.get("cases") or 0
                    neg = t.get("negative_sentiment_pct") or t.get("negative_percentage")
                    extra = f" — {neg:.1f}% negative" if neg is not None else ""
                    lines.append(f"{idx}. **{name}** ({vol:,} cases{extra})")
                elif isinstance(t, str):
                    lines.append(f"{idx}. **{t}**")
            lines.append("")

        # Sample customer quotes if retrieved
        if customer_context:
            lines.append("💬 **Verbatim Customer Voice:**")
            for idx, quote in enumerate(customer_context[:2], 1):
                lines.append(f"{idx}. *\"{quote}\"*")
            lines.append("")

        # Actionable Recommendations
        recs = analytics.get("recommendations") or []
        if recs:
            lines.append("💡 **Targeted Operational Interventions:**\n")
            for idx, r in enumerate(recs[:2], 1):
                if isinstance(r, dict):
                    action = r.get("action") or r.get("recommendation") or str(r)
                    owner = r.get("owner") or "Support Operations"
                    lines.append(f"{idx}. **{owner}**: {action}")
                else:
                    lines.append(f"{idx}. {r}")
        else:
            lines.append("💡 **Targeted Operational Interventions:**\n")
            lines.append("1. **Support Operations**: Route escalated high-friction tickets directly to Tier-2 specialists.")
            lines.append("2. **Engineering**: Prioritize hotfixes for recurring complaint drivers.")

        lines.append("\n✨ *Let me know if you'd like to dive deeper into any specific topic or explore customer sentiment trends!*")
        return "\n".join(lines)

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
