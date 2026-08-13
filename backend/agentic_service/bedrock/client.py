import json
import os
from typing import Any

from backend.config.settings import settings as backend_settings
from backend.agentic_service.agent.prompts import BEDROCK_SYSTEM_PROMPT
from backend.agentic_service.bedrock.model import BedrockResponseModel
from backend.agentic_service.config import get_settings


class BedrockClient:
    """Thin Bedrock adapter. Uses a deterministic mock unless configured otherwise."""

    def __init__(self, model_id: str | None = None, use_mock: bool | None = None) -> None:
        settings = get_settings()
        self.model_id = model_id or settings.bedrock_model_id
        self.use_mock = settings.use_bedrock_mock if use_mock is None else use_mock
        self.aws_region = settings.aws_region

    def generate_response(self, question: str, context: dict[str, Any]) -> BedrockResponseModel:
        if self.use_mock:
            return BedrockResponseModel(
                text=self._mock_response(question, context),
                model_id=self.model_id,
                used_mock=True,
            )
        return BedrockResponseModel(text=self._invoke_bedrock(question, context), model_id=self.model_id, used_mock=False)

    def _mock_response(self, question: str, context: dict[str, Any]) -> str:
        facts = []
        analytics = context.get("analytics", {})
        nlp = context.get("nlp", {})
        customer_context = context.get("customer_context", [])

        if analytics:
            facts.append(f"Validated analytics context is available for: {', '.join(analytics.keys())}.")
        if nlp:
            facts.append(f"Validated NLP context is available for: {', '.join(nlp.keys())}.")
        if customer_context:
            facts.append(f"{len(customer_context)} retrieved customer-context snippets are available.")
        if not facts:
            facts.append("No validated context was available for this question.")

        return (
            f"Question: {question}\n\n"
            f"Facts:\n- " + "\n- ".join(facts) + "\n\n"
            "Recommendations:\n- Review the validated facts above before acting; no unsupported causation is claimed."
        )

    def _invoke_bedrock(self, question: str, context: dict[str, Any]) -> str:
        import base64
        import requests

        token = backend_settings.aws_bearer_token_bedrock
        is_mantle = False
        if token:
            try:
                # Check if decoded token contains "MantleApiKey-"
                if token.startswith("ABSK"):
                    decoded = base64.b64decode(token[4:]).decode('utf-8', errors='ignore')
                else:
                    decoded = base64.b64decode(token).decode('utf-8', errors='ignore')
                if "MantleApiKey-" in decoded:
                    is_mantle = True
            except Exception:
                pass

        if is_mantle:
            url = f"https://bedrock-mantle.{self.aws_region}.api.aws/v1/chat/completions"
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
            response = requests.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                raise Exception(f"Mantle API error: {response.text}")

        # Fallback to standard Bedrock Runtime
        import boto3
        if token:
            os.environ["AWS_BEARER_TOKEN_BEDROCK"] = token

        client = boto3.client("bedrock-runtime", region_name=self.aws_region)
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
