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

OUT_OF_CONTEXT_PATTERNS = [
    r"\b(recipe|cooking|bake|oven|ingredient)\b",
    r"\b(football|soccer|basketball|cricket|tennis|nba|nfl|world.cup)\b",
    r"\b(weather|forecast|temperature|rain|sunny)\b",
    r"\b(movie|film|netflix|disney|actor|actress|oscar)\b",
    r"\b(song|music|playlist|album|concert|spotify)\b",
    r"\b(stock|share|invest|crypto|bitcoin|forex|trading)\b",
    r"\b(nasa|space|mars|moon|rocket|astronaut)\b",
    r"\b(politics|election|president|senate|congress)\b",
    r"\b(pokemon|avatar|game.of.thrones|marvel|dc)\b",
    r"\b(travel|hotel|flight|airline|visa|passport)\b",
    r"\b(python|javascript|programming|sql|git|docker)\b",
    r"\b(poem|poetry|novel|literature|shakespeare)\b",
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
    "first.contact", "resolution.rate", "response.time", "turnaround", "backlog",
    "data", "dataset", "datasets", "record", "records", "conversation", "conversations", "ticket", "tickets",
    "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026",
    "year", "years", "month", "months", "period", "historical", "history", "time", "date", "dates",
    "company", "companies", "brand", "brands", "amazon", "apple", "uber", "spotify", "tesla", "airline",
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

    @staticmethod
    def _is_out_of_context(query: str) -> bool:
        import re
        q_lower = query.lower().strip()
        for pattern in OUT_OF_CONTEXT_PATTERNS:
            if re.search(pattern, q_lower):
                return True
        words = set(q_lower.split())
        if words & ANALYTICS_KEYWORDS:
            return False
        if len(words) <= 3:
            return False
        analytics_overlap = len(words & ANALYTICS_KEYWORDS)
        return analytics_overlap == 0

    def answer(self, request: QueryRequest, user: str = "deepak") -> AgentResponse:
        from backend.rag.query_preprocessor import normalize_and_correct_query
        
        q_raw = (request.question or "").strip()

        if not q_raw:
            return AgentResponse(
                status="success",
                query_type="empty_query",
                required_tools=[],
                answer="Please enter a customer query.",
                context={"validation": "empty"},
                data_confidence=DataConfidence.NO_DATA_AVAILABLE,
            )

        norm_result = normalize_and_correct_query(q_raw)
        q_normalized = norm_result["normalized_query"]
        if norm_result["was_corrected"]:
            print(f"[Agent Query Normalization]: '{q_raw}' -> '{q_normalized}' (fixes: {norm_result['corrected_words']})", flush=True)

        words = [w for w in q_normalized.split() if w.strip()]
        common_short_intents = {
            "hi", "hello", "hey", "howdy", "sup", "help", "thanks", "thank", "status", 
            "summary", "kpi", "kpis", "topics", "clusters", "reopen", "fcr", "sla", "csat", 
            "ok", "okay", "bye", "who", "what", "p0", "p1", "p2", "issues", "metrics", "trends"
        }
        clean_short = q_normalized.lower().strip("!?,.:;\"'() \t\n")
        if len(words) == 1 and len(clean_short) < 15 and clean_short not in common_short_intents:
            return AgentResponse(
                status="success",
                query_type="vague_query",
                required_tools=[],
                answer=f"Hey! Your query '{q_raw}' is a bit brief to identify a specific customer issue. Could you please provide a little more context? (For example: 'Why are customers having issues with {q_normalized.lower()}?' or 'What is our average SLA response time?').",
                context={"validation": "too_vague"},
                data_confidence=DataConfidence.NO_DATA_AVAILABLE,
            )

        q_lower = q_raw.lower()
        capability_patterns = [
            "what can this app", "what does this app", "what can we analyze", "what can i analyze",
            "how to use this app", "features of this app", "what are the features", "capabilities",
            "enna", "panlam", "analys panlam", "ndha app", "indha app", "kya analyze", "kya kar sakte",
            "what analysis", "guide me", "how does voila work", "what is voila"
        ]
        if any(p in q_lower for p in capability_patterns):
            overview_text = (
                "👋 **Welcome to Voilà AI — Voice-of-Customer (VoC) Intelligence Platform!**\n\n"
                "Here are the core operational and strategic analyses you can perform across your customer support datasets:\n\n"
                "1. 📊 **Sentiment Decomposition & Trajectories**:\n"
                "   - Track positive, neutral, and negative customer tone trends over time (Daily, Weekly, Monthly, Yearly).\n\n"
                "2. 🚨 **Algorithmic Root Cause & Topic Clustering**:\n"
                "   - Automatic BERTopic discovery identifying top complaint drivers (e.g. *Billing Disputes, Delivery Delays, App Crashes, Account Authentication*).\n\n"
                "3. ⏱️ **Operational SLA Velocity & Triage**:\n"
                "   - Measure mean response latency and triage compliance across turnaround tiers (`<15m`, `15–60m`, `1–4h`, `>4h critical breaches`).\n\n"
                "4. 🛡️ **Quality & Resolution KPIs**:\n"
                "   - Real-time First Contact Resolution (FCR), Escalation Rates, Reopen Rates, and CSAT predictive indicators.\n\n"
                "5. 🌍 **360° Multi-Perspective Segmentation**:\n"
                "   - Filter and slice metrics across **Brands, Operating Companies, Product Lines, Geographic Territories**, and specific date windows.\n\n"
                "6. 💬 **Live RAG Conversation Evidence**:\n"
                "   - Inspect verbatim customer complaints paired directly with company support responses and confidence-scored citations.\n\n"
                "7. 📈 **Comparative Delta Intelligence**:\n"
                "   - Benchmark datasets side-by-side (run-over-run or year-over-year) to identify emerging spikes and recurring issues.\n\n"
                "💡 *To get started, upload your customer support CSV/Parquet export via the **Upload** tab, or ask me any question like:* \n"
                "- *\"What are our top complaint categories?\"*\n"
                "- *\"Why are customers experiencing delivery issues?\"*\n"
                "- *\"What is our average SLA turnaround time?\"*"
            )
            return AgentResponse(
                status="success",
                query_type="platform_capabilities",
                required_tools=[],
                answer=overview_text,
                context={"topic": "platform_capabilities"},
                data_confidence=DataConfidence.MEASURED,
            )

        if self._is_out_of_context(q_raw):
            return AgentResponse(
                status="success",
                query_type="out_of_context",
                required_tools=[],
                answer=(
                    "I appreciate your question, but my expertise is focused on analyzing **customer support operations, "
                    "sentiment analytics, SLA metrics, and complaint topic clustering** from your live dataset.\n\n"
                    "**Out of Context** - I can't help with that query, but here are some things I can help with:\n\n"
                    "- **Dashboard Overview**: \"Give me an executive dashboard summary\"\n"
                    "- **Critical Issues**: \"What are the top complaint categories?\"\n"
                    "- **SLA Metrics**: \"What is our average response time and resolution rate?\"\n"
                    "- **Root Cause**: \"Why are customers experiencing billing disputes?\"\n"
                    "- **Regional Analysis**: \"How does APAC sentiment compare to North America?\""
                ),
                context={"validation": "out_of_context"},
                data_confidence=DataConfidence.NO_DATA_AVAILABLE,
            )

        try:
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
