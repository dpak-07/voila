import json
import os
import time
from typing import Any

from backend.config.settings import settings as backend_settings
from backend.agentic_service.bedrock.model import BedrockResponseModel
from backend.agentic_service.config import get_settings

BEDROCK_SYSTEM_PROMPT = """You are the response layer for a social-media service analytics agent.
Rules:
1. Never invent metrics or customer complaints.
2. Use only validated analytics, NLP, and retrieval context.
3. Clearly mention unavailable data.
4. Separate facts from recommendations.
5. Provide actionable root causes and prioritized interventions for product, network, and support teams.
"""


class BedrockClient:
    """Thin Bedrock adapter with reliable deterministic grounded fallback synthesis."""

    _circuit_open_until = 0

    def __init__(self, model_id: str | None = None, use_mock: bool | None = None) -> None:
        settings = get_settings()
        self.model_id = model_id or settings.bedrock_model_id
        self.use_mock = settings.use_bedrock_mock if use_mock is None else use_mock
        self.aws_region = settings.aws_region

    def generate_response(self, question: str, context: dict[str, Any]) -> BedrockResponseModel:
        if self.use_mock or time.time() < BedrockClient._circuit_open_until:
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
            BedrockClient._circuit_open_until = time.time() + 60
            print(f"[Bedrock Invocation Fast Fallback to Grounded Synthesis]: {e}", flush=True)

        return BedrockResponseModel(
            text=self._mock_response(question, context),
            model_id=self.model_id,
            used_mock=True,
        )

    def _mock_response(self, question: str, context: dict[str, Any]) -> str:
        analytics = context.get("analytics", {}) or {}
        nlp = context.get("nlp", {}) or {}
        customer_context = context.get("customer_context", []) or []

        # Extract structured metric evidence if present
        kpis = analytics.get("kpi_metrics") or analytics.get("kpis") or analytics or {}
        tot_conv = kpis.get("total_conversations") or kpis.get("total_records")
        res_rate = kpis.get("resolution_rate")
        reopen_rate = kpis.get("reopen_rate")
        resp_time = kpis.get("avg_response_time_minutes")
        neg_pct = kpis.get("negative_sentiment_percentage")

        lines = [f"### Grounded Operational Analysis\n"]

        if tot_conv is not None:
            lines.append(f"Based on real database telemetry across **{tot_conv:,}** customer interactions:")
            stat_bullets = []
            if res_rate is not None:
                stat_bullets.append(f"- **Resolution Rate**: {res_rate:.1f}%")
            if resp_time is not None:
                stat_bullets.append(f"- **Average Response Time**: {resp_time:.1f} minutes")
            if reopen_rate is not None:
                stat_bullets.append(f"- **Reopen Rate**: {reopen_rate:.1f}%")
            if neg_pct is not None:
                stat_bullets.append(f"- **Negative Friction Share**: {neg_pct:.1f}%")
            if stat_bullets:
                lines.append("\n".join(stat_bullets))
                lines.append("")

        # Top Topics / NLP Clusters
        topics = analytics.get("customer_pain_points") or analytics.get("topic_summaries") or nlp.get("topics") or []
        if isinstance(topics, list) and topics:
            lines.append("🔥 **Top Customer Complaint Drivers:**")
            for idx, t in enumerate(topics[:3], 1):
                name = t.get("cluster_name") or t.get("topic_keywords") or t.get("name") or f"Topic #{idx}"
                vol = t.get("volume") or t.get("count") or 0
                lines.append(f"{idx}. **{name}** ({vol:,} cases)")
            lines.append("")

        # Customer Evidence Quotes
        quotes = customer_context or analytics.get("sample_conversations") or []
        if isinstance(quotes, list) and quotes:
            lines.append("🗣️ **Verbatim Customer Evidence:**")
            for q_item in quotes[:2]:
                text = q_item.get("text") if isinstance(q_item, dict) else str(q_item)
                if text:
                    lines.append(f"- *\"{text.strip()}\"*")
            lines.append("")

        # Actionable Recommendations
        recs = analytics.get("recommendations") or []
        if recs:
            lines.append("💡 **Actionable Recommendations:**\n")
            for idx, r in enumerate(recs[:2], 1):
                action = r.get("action") or r.get("recommendation") or str(r)
                owner = r.get("owner") or "Support Operations"
                lines.append(f"{idx}. **{owner}**: {action}")
        else:
            lines.append("💡 **Actionable Recommendations:**\n")
            lines.append("1. **First-Response SLA**: Route escalated high-friction tickets directly to Tier-2 support.")
            lines.append("2. **Systemic Issue Hotfix**: Deploy targeted engineering fix for the leading complaint category.")

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
            payload = {
                "model": self.model_id,
                "messages": [
                    {"role": "system", "content": BEDROCK_SYSTEM_PROMPT},
                    {"role": "user", "content": json.dumps({"question": question, "validated_context": context})}
                ],
                "max_tokens": 800
            }
            response = requests.post(url, headers=headers, json=payload, timeout=2.0)
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
