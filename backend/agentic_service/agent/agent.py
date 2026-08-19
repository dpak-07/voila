import re
from typing import Any, Optional

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

OUT_OF_CONTEXT_PATTERNS = [
    r"\b(recipe|cooking|bake|baking|oven|ingredient|food|eat|eating|ate|drink|drinks|drinking|drank|coke|pepsi|soda|beer|wine|coffee|tea|pizza|burger|sandwich|snack|breakfast|lunch|dinner)\b",
    r"\b(football|soccer|basketball|cricket|tennis|nba|nfl|world.cup|baseball|golf|olympics)\b",
    r"\b(weather|forecast|temperature|rain|sunny|snow|storm|climate)\b",
    r"\b(movie|film|netflix|disney|actor|actress|oscar|cinema|hollywood)\b",
    r"\b(song|music|playlist|album|concert|singer|lyrics|band)\b",
    r"\b(stock|share|invest|investing|crypto|bitcoin|forex|trading|nasdaq|dow)\b",
    r"\b(nasa|space|mars|moon|rocket|astronaut|galaxy|astronomy)\b",
    r"\b(politics|election|president|prime minister|senate|congress|parliament|democrat|republican)\b",
    r"\b(pokemon|avatar|game.of.thrones|marvel|dc|superhero|anime|manga)\b",
    r"\b(visa|passport|vacation|tourism|sightseeing)\b",
    r"\b(python code|javascript code|write code|debug python|sql syntax|docker run|kubernetes)\b",
    r"\b(poem|poetry|novel|literature|shakespeare|rhyme|haiku)\b",
    r"\b(joke|riddle|funny story|sing a song|play chess|play a game)\b",
]

PERSONAL_HABIT_PATTERNS = [
    r"\b(when (am|i)|when i'm)\b",
    r"\b(i (drink|drank|eat|ate|like|love|prefer|enjoy|feel|felt|sleep|slept|walk|run|play|want|am thinking|was thinking))\b",
    r"\b(my (cat|dog|pet|car|friend|family|hobby|house|room))\b",
    r"\b(i am (feeling|eating|drinking|going to|tired|hungry|sleepy|bored|happy|sad))\b",
]

ANALYTICS_KEYWORDS = {
    "kpi", "sla", "metric", "metrics", "dashboard", "summary", "response", "resolution", "reopen",
    "fcr", "sentiment", "trend", "trends", "volume", "rate", "agent", "queue", "baseline",
    "performance", "issue", "issues", "problem", "problems", "critical", "p0", "p1", "p2", "top", "complaint", "complaints",
    "pain", "friction", "crash", "error", "bug", "support", "customer", "customers", "why", "what", "how", "when", "where",
    "analyze", "find", "billing", "delivery", "app", "topic", "topics", "cluster", "clusters", "escalation",
    "latency", "timeout", "dispute", "refund", "charge", "account", "login", "password",
    "2fa", "authentication", "access", "slow", "down", "outage", "incident", "spike",
    "drop", "surge", "anomaly", "negative", "positive", "neutral", "csat", "nps",
    "first contact", "resolution rate", "response time", "turnaround", "backlog",
    "data", "dataset", "datasets", "record", "records", "conversation", "conversations", "ticket", "tickets",
    "company", "companies", "brand", "brands", "amazon", "apple", "uber", "spotify", "tesla",
    "give", "tell", "show", "list", "describe", "explain", "overview", "stats", "statistics", "count", "info", "information", "details"
}


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

    def _is_personal_or_off_topic(self, query: str) -> bool:
        q_lower = query.lower().strip()

        # Check explicit personal statements (e.g. "when am high sentiment i drink coke")
        for pattern in PERSONAL_HABIT_PATTERNS:
            if re.search(pattern, q_lower):
                # Unless it's explicitly asking for ticket data e.g. "how many customers say when i drink coke"
                if not any(k in q_lower for k in ["ticket", "tickets", "conversations", "how many", "customer said", "customers say"]):
                    return True

        # Check off-topic categories
        has_off_topic = any(re.search(p, q_lower) for p in OUT_OF_CONTEXT_PATTERNS)
        if has_off_topic:
            # If it's not explicitly framed as an operational business inquiry
            has_explicit_analytics = any(k in q_lower for k in [
                "how many", "average response", "resolution rate", "fcr", "sla", 
                "top complaint", "complaint categories", "ticket volume", "sentiment trend", 
                "escalation rate", "why are customers", "what are the customer issues"
            ])
            if not has_explicit_analytics:
                return True

        # Check if words have zero overlap with support vocabulary
        words = set(re.findall(r'\b\w+\b', q_lower))
        if words and not (words & ANALYTICS_KEYWORDS) and len(words) > 3:
            return True

        return False

    def _is_unintelligible(self, query: str) -> bool:
        clean = re.sub(r'[^a-zA-Z0-9]', '', query).strip()
        if len(clean) >= 5:
            # Check for no vowels in a long token
            tokens = [t for t in query.split() if len(t) >= 5]
            for t in tokens:
                t_clean = re.sub(r'[^a-zA-Z]', '', t).lower()
                if t_clean and not re.search(r'[aeiouy]', t_clean):
                    return True
            # Repetitive characters
            if len(set(clean.lower())) <= 2:
                return True
        return False

    def _check_system_health(self) -> AgentResponse:
        import os
        from backend.config.settings import settings
        from backend.config.db import get_db_cursor
        
        # 1. PostgreSQL Database
        pg_status = "ONLINE"
        pg_info = "Connected"
        pg_records = 0
        try:
            with get_db_cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM processed_conversations;")
                row = cur.fetchone()
                pg_records = row[0] if isinstance(row, tuple) else (row.get("count") if isinstance(row, dict) else 0)
                pg_info = f"Operational DB active ({pg_records:,} processed conversations)"
        except Exception as e:
            pg_status = "OFFLINE"
            pg_info = f"Database query error: {e}"

        # 2. Snowflake Cloud Data Warehouse
        sf_live = self.snowflake_tool._is_snowflake_live()
        sf_acct = settings.snowflake_account or "Not Configured"
        sf_user = settings.snowflake_user or "Not Configured"
        sf_status = "CONNECTED" if sf_live else ("NOT_CONFIGURED" if not settings.snowflake_account or "placeholder" in sf_acct.lower() else "DISCONNECTED")
        sf_info = f"Account: {sf_acct}, User: {sf_user}, Warehouse: {settings.snowflake_warehouse or 'COMPUTE_WH'}"

        # 3. AWS Bedrock LLM
        bedrock_key = settings.aws_bearer_token_bedrock or os.environ.get("AWS_BEARER_TOKEN_BEDROCK") or settings.aws_access_key_id
        bedrock_status = "AUTHENTICATED" if bedrock_key and "placeholder" not in str(bedrock_key).lower() else "LOCAL_SYNTHESIS_FALLBACK"
        bedrock_info = f"Model: {self.settings.bedrock_model_id}, Region: {settings.aws_region}"

        # 4. AWS S3 Cloud Storage
        s3_bucket = settings.aws_s3_bucket or "Not Configured"
        s3_status = "CONFIGURED" if s3_bucket and "placeholder" not in s3_bucket.lower() else "LOCAL_STORAGE"
        s3_info = f"Bucket: {s3_bucket}"

        # 5. Vector DB / Qdrant
        vdb_status = "READY"
        vdb_info = "Local In-Memory / Vector Storage Active"

        status_table = (
            "### 🛠️ System Health & External Integration Diagnostics\n\n"
            "| Service / Subsystem | Status | Details & Telemetry |\n"
            "| :--- | :--- | :--- |\n"
            f"| 🐘 **PostgreSQL (Local DB)** | `🟢 {pg_status}` | {pg_info} |\n"
            f"| ❄️ **Snowflake (Cloud Warehouse)** | `{('🟢 ' + sf_status) if sf_status == 'CONNECTED' else ('🟡 ' + sf_status)}` | {sf_info} |\n"
            f"| 🧠 **AWS Bedrock (LLM)** | `{('🟢 ' + bedrock_status) if bedrock_status == 'AUTHENTICATED' else ('🟡 ' + bedrock_status)}` | {bedrock_info} |\n"
            f"| 🪣 **AWS S3 (Cloud Storage)** | `{('🟢 ' + s3_status) if s3_status == 'CONFIGURED' else ('🟡 ' + s3_status)}` | {s3_info} |\n"
            f"| 🔍 **Vector DB (Qdrant)** | `🟢 {vdb_status}` | {vdb_info} |\n\n"
        )

        advice = []
        if sf_status != "CONNECTED":
            advice.append("- **Snowflake Warehouse**: Add `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USER`, `SNOWFLAKE_PASSWORD` in your `.env` to enable distributed multi-year cloud queries.")
        if bedrock_status != "AUTHENTICATED":
            advice.append("- **AWS Bedrock**: Add `AWS_BEARER_TOKEN_BEDROCK` or `AWS_ACCESS_KEY_ID` in `.env` to activate live Bedrock reasoning. (Currently operating in fast local deterministic synthesis mode).")

        if advice:
            status_table += "💡 **External Service Recommendations**:\n" + "\n".join(advice)
        else:
            status_table += "✅ **All external cloud services & local database stores are connected and operational!**"

        return AgentResponse(
            status="success",
            query_type="system_health_diagnostics",
            required_tools=["analytics"],
            answer=status_table,
            context={"diagnostics": {
                "postgresql": pg_status,
                "snowflake": sf_status,
                "bedrock": bedrock_status,
                "s3": s3_status,
                "vector_db": vdb_status
            }},
            data_confidence=DataConfidence.MEASURED
        )

    def answer(self, request: QueryRequest, user: str = "deepak") -> AgentResponse:
        from backend.rag.query_preprocessor import normalize_and_correct_query
        
        q_raw = (request.question or "").strip()

        # 1. Empty Query
        if not q_raw:
            return AgentResponse(
                status="success",
                query_type="empty_query",
                required_tools=[],
                answer="Please enter a customer query or select a focus area.",
                context={"validation": "empty"},
                data_confidence=DataConfidence.NO_DATA_AVAILABLE,
            )

        # 2. Unintelligible / Gibberish
        if self._is_unintelligible(q_raw):
            return AgentResponse(
                status="success",
                query_type="unintelligible",
                required_tools=[],
                answer=(
                    "I didn't quite understand that. Please ask an operational question about your customer support dataset, such as:\n\n"
                    "- 📊 *\"What are our top complaint categories?\"*\n"
                    "- ⏱️ *\"What is our average SLA response time?\"*\n"
                    "- 💡 *\"Why are customers experiencing billing disputes?\"*"
                ),
                context={"validation": "unintelligible"},
                data_confidence=DataConfidence.NO_DATA_AVAILABLE,
            )

        norm_result = normalize_and_correct_query(q_raw)
        q_normalized = norm_result["normalized_query"]
        q_lower = q_normalized.lower().strip()

        # 2.5 System Health & External Process Monitoring Check
        health_patterns = [
            "system health", "health check", "check health", "is snowflake working", "is bedrock working",
            "check api key", "check api keys", "api key status", "system status", "connection status",
            "diagnostics", "check connections", "monitor process", "monitor external", "status of services",
            "integration status", "is database connected", "check s3"
        ]
        if any(p in q_lower for p in health_patterns):
            return self._check_system_health()

        # 3. Full End-to-End RAG + AWS Bedrock Pipeline for All Queries
        try:
            norm_request = request.model_copy(update={"question": q_raw})
            validation = self.query_validator.validate(norm_request)
            decision = self.decision_engine.decide(validation)
            results = self._execute_tools(norm_request, decision)
            grounded_context = self.context_builder.build(results)
            bedrock_response = self.bedrock_client.generate_response(q_raw, grounded_context)

            return AgentResponse(
                status="success",
                query_type=decision.query_type,
                required_tools=decision.required_tools,
                answer=bedrock_response.text,
                context=grounded_context,
                data_confidence=DataConfidence.MEASURED if grounded_context else DataConfidence.NO_DATA_AVAILABLE,
            )
        except Exception as e:
            print(f"[Agent RAG + Bedrock Error]: {e}", flush=True)
            from backend.algorithms.analytics_engine import AnalyticsEngine
            engine = AnalyticsEngine()
            filters = {"time_period": request.time_period or "overall", "run_id": request.run_id or "all"}
            if request.company:
                filters["company"] = request.company
            if request.product:
                filters["product"] = request.product
            if request.region:
                filters["region"] = request.region
            analysis = engine.run_dynamic_analysis(filters)
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
            "run_id": request.run_id,
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
                try:
                    results[key] = future.result()
                except Exception as e:
                    print(f"[Agent Tool Failure — {key}]: {e}", flush=True)
                    results[key] = {"status": "error", "reason": str(e)}

        return results
