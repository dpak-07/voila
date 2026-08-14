from typing import Any

from backend.agentic_service.agent.decision_engine import DecisionEngine
from backend.agentic_service.agent.query_validator import QueryValidator
from backend.agentic_service.agent.result_validator import ResultValidator
from backend.agentic_service.bedrock.client import BedrockClient
from backend.agentic_service.rag.context_builder import ContextBuilder
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

    def answer(self, request: QueryRequest) -> AgentResponse:
        validation = self.query_validator.validate(request)
        if validation.status == "insufficient_data":
            return AgentResponse(
                status="insufficient_data",
                query_type=validation.query_type,
                answer=validation.reason or "The dataset cannot answer this question.",
                validation_issues=[],
                context={"required_data": validation.required_data},
            )

        decision = self.decision_engine.decide(validation)
        results = self._execute_tools(request, decision)
        validation_issues = self.result_validator.validate(results, decision.required_tools)
        if validation_issues:
            return AgentResponse(
                status="validation_failed",
                query_type=decision.query_type,
                required_tools=decision.required_tools,
                answer="The agent found data, but validation failed. No grounded answer was generated.",
                validation_issues=validation_issues,
                context=results,
            )

        grounded_context = self.context_builder.build(results)
        bedrock_response = self.bedrock_client.generate_response(request.question, grounded_context)
        return AgentResponse(
            status="success",
            query_type=decision.query_type,
            required_tools=decision.required_tools,
            answer=bedrock_response.text,
            context=grounded_context,
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
        conversations = request.conversations or DEFAULT_CONVERSATIONS
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
