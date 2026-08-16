from typing import Any

from backend.agentic_service.agent.decision_engine import DecisionEngine
from backend.agentic_service.agent.query_validator import QueryValidator
from backend.agentic_service.agent.result_validator import ResultValidator
from backend.agentic_service.bedrock.client import BedrockClient
from backend.agentic_service.config import get_settings
from backend.agentic_service.rag.context_builder import ContextBuilder
from backend.agentic_service.schemas.confidence import DataConfidence
from backend.agentic_service.schemas.query import QueryRequest, ToolDecision
from backend.agentic_service.schemas.response import AgentResponse
from backend.agentic_service.tools import AnalyticsTool, NLPTool, SnowflakeTool, VectorDBTool


DEFAULT_CONVERSATIONS = [
    "The app keeps crashing after login.",
    "The latest update made the application unstable.",
    "I cannot log in after resetting my password.",
]


class AgenticService:
    def __init__(
        self,
        query_validator: QueryValidator | None = None,
        decision_engine: DecisionEngine | None = None,
        result_validator: ResultValidator | None = None,
        context_builder: ContextBuilder | None = None,
        bedrock_client: BedrockClient | None = None,
        analytics_tool: AnalyticsTool | None = None,
        nlp_tool: NLPTool | None = None,
        snowflake_tool: SnowflakeTool | None = None,
        vector_db_tool: VectorDBTool | None = None,
    ) -> None:
        self.query_validator = query_validator or QueryValidator()
        self.decision_engine = decision_engine or DecisionEngine()
        self.result_validator = result_validator or ResultValidator()
        self.context_builder = context_builder or ContextBuilder()
        self.bedrock_client = bedrock_client or BedrockClient()
        self.analytics_tool = analytics_tool or AnalyticsTool()
        self.nlp_tool = nlp_tool or NLPTool()
        self.snowflake_tool = snowflake_tool or SnowflakeTool()
        self.vector_db_tool = vector_db_tool or VectorDBTool()
        self.settings = get_settings()

    def answer(self, request: QueryRequest, user: str = "deepak") -> AgentResponse:
        from backend.rag.query_preprocessor import normalize_and_correct_query
        
        q_raw = (request.question or "").strip()

        # 0. Basic Input Quality Validation
        if not q_raw:
            return AgentResponse(
                status="success",
                query_type="empty_query",
                required_tools=[],
                answer="Please enter a customer query.",
                context={"validation": "empty"},
                data_confidence=DataConfidence.NO_DATA_AVAILABLE,
            )

        # 1. Query Normalization & Spell Correction Preprocessing
        norm_result = normalize_and_correct_query(q_raw)
        q_normalized = norm_result["normalized_query"]
        if norm_result["was_corrected"]:
            print(f"[Agent Query Normalization]: '{q_raw}' -> '{q_normalized}' (fixes: {norm_result['corrected_words']})", flush=True)

        words = [w for w in q_normalized.split() if w.strip()]
        common_short_intents = {"hi", "hello", "help", "thanks", "status", "summary", "kpi", "topics", "clusters", "reopen", "fcr", "ok", "okay", "bye", "who", "what"}
        if len(words) == 1 and len(q_normalized) < 15 and q_normalized.lower() not in common_short_intents:
            return AgentResponse(
                status="success",
                query_type="vague_query",
                required_tools=[],
                answer=f"Your query '{q_raw}' is too brief to identify a specific customer issue. Could you please provide more context? (For example: 'Why are customers having issues with their {q_normalized.lower()}?').",
                context={"validation": "too_vague"},
                data_confidence=DataConfidence.NO_DATA_AVAILABLE,
            )

        # 2. Pure Autonomous Agentic Tooling & Grounded LLM Reasoning Pipeline
        try:
            # Create normalized request for downstream tools and validators
            norm_request = request.model_copy(update={"question": q_normalized})
            validation = self.query_validator.validate(norm_request)
            if validation.status == "insufficient_data":
                return AgentResponse(
                    status="insufficient_data",
                    query_type=validation.query_type,
                    answer=validation.reason or "The dataset cannot answer this question.",
                    validation_issues=[],
                    context={"required_data": validation.required_data},
                    data_confidence=DataConfidence.NO_DATA_AVAILABLE,
                )

            decision = self.decision_engine.decide(validation)
            results = self._execute_tools(norm_request, decision)
            validation_issues = self.result_validator.validate(results, decision.required_tools)
            grounded_context = self.context_builder.build(results)
            bedrock_response = self.bedrock_client.generate_response(q_normalized, grounded_context)

            return AgentResponse(
                status="success",
                query_type=decision.query_type,
                required_tools=decision.required_tools,
                answer=bedrock_response.text,
                context=grounded_context,
                data_confidence=DataConfidence.MEASURED if grounded_context else DataConfidence.NO_DATA_AVAILABLE,
            )
        except Exception as e:
            print(f"[Agent Dynamic Fallback Execution]: {e}", flush=True)
            from backend.algorithms.analytics_engine import AnalyticsEngine
            engine = AnalyticsEngine()
            analysis = engine.get_analysis_hub(user=user, filters={"time_period": request.time_period or "overall", "run_id": request.run_id or "all"})
            bedrock_response = self.bedrock_client.generate_response(request.question, {"analytics": analysis})
            return AgentResponse(
                status="success",
                query_type="general",
                required_tools=["analytics_hub"],
                answer=bedrock_response.text,
                context=analysis,
                data_confidence=DataConfidence.MEASURED,
            )

    def preview_decision(self, request: QueryRequest) -> ToolDecision:
        validation = self.query_validator.validate(request)
        return self.decision_engine.decide(validation)

    def _execute_tools(self, request: QueryRequest, decision: ToolDecision) -> dict[str, Any]:
        from concurrent.futures import ThreadPoolExecutor

        filters = {
            "company": request.company,
            "product": request.product,
            "region": request.region,
            "time_period": request.time_period,
        }
        fallback_conversations = DEFAULT_CONVERSATIONS if self.settings.agentic_demo_mode else []
        conversations = request.conversations or fallback_conversations
        results: dict[str, Any] = {}
        tasks = []

        with ThreadPoolExecutor() as executor:
            if "analytics" in decision.required_tools:
                tasks.append(
                    ("analytics", executor.submit(
                        self.analytics_tool.run,
                        decision.required_actions.get("analytics", []),
                        **filters
                    ))
                )
            if "snowflake" in decision.required_tools:
                tasks.append(
                    ("snowflake", executor.submit(
                        self.snowflake_tool.run,
                        decision.required_actions.get("snowflake", []),
                        **filters
                    ))
                )
            if "nlp" in decision.required_tools:
                tasks.append(
                    ("nlp", executor.submit(
                        self.nlp_tool.run,
                        decision.required_actions.get("nlp", []),
                        conversations
                    ))
                )
            if "vector_db" in decision.required_tools:
                tasks.append(
                    ("vector_db", executor.submit(
                        self.vector_db_tool.run,
                        decision.required_actions.get("vector_db", []),
                        request.question,
                        **filters
                    ))
                )

            for key, future in tasks:
                results[key] = future.result()

        return results
