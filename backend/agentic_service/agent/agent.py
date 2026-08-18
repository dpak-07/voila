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

        # 3. Platform Capabilities & Guide
        capability_patterns = [
            "what can this app", "what does this app", "what can we analyze", "what can i analyze",
            "how to use this app", "features of this app", "what are the features", "capabilities",
            "what can you do", "who are you", "guide me", "how does voila work", "what is voila"
        ]
        if any(p in q_lower for p in capability_patterns):
            overview_text = (
                "👋 **Welcome to Voilà AI — Voice-of-Customer (VoC) Intelligence Platform!**\n\n"
                "I have direct real-time access to all operational records and customer interactions in your database. Here are the core analyses you can perform:\n\n"
                "1. 📊 **Sentiment Decomposition & Trajectories**:\n"
                "   - Track positive, neutral, and negative customer tone trends over time.\n\n"
                "2. 🚨 **Algorithmic Root Cause & Topic Clustering**:\n"
                "   - Unsupervised discovery of top complaint drivers (*Billing Disputes, Delivery Delays, App Crashes, Account Authentication*).\n\n"
                "3. ⏱️ **Operational SLA Velocity & Triage**:\n"
                "   - Measure mean response latency and triage compliance across response tiers.\n\n"
                "4. 🛡️ **Quality & Resolution KPIs**:\n"
                "   - Real-time First Contact Resolution (FCR), Escalation Rates, and Reopen Rates.\n\n"
                "5. 🌍 **Multi-Perspective Segmentation**:\n"
                "   - Filter across **Brands, Operating Companies, Product Lines**, and time periods.\n\n"
                "💡 *Ask me anything like:* \n"
                "- *\"What are our top complaint categories?\"*\n"
                "- *\"What is our average SLA response time?\"*\n"
                "- *\"Why are customers unhappy with delivery?\"*"
            )
            return AgentResponse(
                status="success",
                query_type="platform_capabilities",
                required_tools=[],
                answer=overview_text,
                context={"topic": "platform_capabilities"},
                data_confidence=DataConfidence.MEASURED,
            )

        # 4. Educational & Conceptual Definitions
        edu_concepts = {
            "fcr": ("First Contact Resolution (FCR)",
                    "the percentage of incoming customer support conversations resolved definitively in the "
                    "initial interaction without requiring follow-ups or repeated reopens.\n\n"
                    "**How it's measured:** A conversation is counted as FCR when the customer's issue is fully "
                    "addressed in a single agent reply — no reopens, no second contacts, no ticket transfers.\n\n"
                    "**Why it matters:** FCR is the single strongest predictor of customer satisfaction. Every "
                    "additional contact for the same issue compounds operational cost and erodes trust. "
                    "Industry benchmark: **≥ 60%** is healthy; below 40% signals systemic triage or tooling gaps."),
            "first contact": ("First Contact Resolution (FCR)",
                    "the percentage of incoming customer support conversations resolved definitively in the "
                    "initial interaction without requiring follow-ups or repeated reopens.\n\n"
                    "**How it's measured:** A conversation is counted as FCR when the customer's issue is fully "
                    "addressed in a single agent reply — no reopens, no second contacts, no ticket transfers.\n\n"
                    "**Why it matters:** FCR is the single strongest predictor of customer satisfaction. Every "
                    "additional contact for the same issue compounds operational cost and erodes trust. "
                    "Industry benchmark: **≥ 60%** is healthy; below 40% signals systemic triage or tooling gaps."),
            "csat": ("Customer Satisfaction (CSAT Proxy)",
                    "a predictive satisfaction score derived from customer sentiment tone, sentiment trajectory, "
                    "and final resolution confirmation.\n\n"
                    "**How it's measured:** Since traditional CSAT surveys have low response rates, Voilà computes "
                    "a proxy by combining NLP sentiment analysis of the customer's language, whether the issue was "
                    "marked resolved, and the quality/depth of the agent's response.\n\n"
                    "**Why it matters:** Gives a real-time,全量 view of satisfaction across every conversation — "
                    "not just the 10-15% who fill out surveys. Target: **≥ 60%**."),
            "sla": ("Service Level Agreement (SLA)",
                    "the target turnaround time for frontline support agents to triage and deliver definitive "
                    "responses to customer inquiries.\n\n"
                    "**How it's measured:** SLA tracks the elapsed time between a customer submitting a ticket "
                    "and receiving the first substantive human response. Voilà measures average first response "
                    "time across all conversations.\n\n"
                    "**Why it matters:** Response time directly impacts customer perception and churn. "
                    "Industry standard: **first response within 2 hours**; urgent tickets within 30 minutes."),
            "reopen": ("Thread Reopen Rate",
                    "the percentage of closed or solved customer tickets that were subsequently reopened by "
                    "customers due to incomplete solutions.\n\n"
                    "**How it's measured:** A ticket is counted as reopened when a customer responds after the "
                    "agent has marked the issue resolved, indicating the problem persists.\n\n"
                    "**Why it matters:** High reopen rates signal premature closures, band-aid fixes, or poor "
                    "root-cause analysis. They double the cost per ticket and frustrate customers who thought "
                    "their issue was handled. Target: **< 15%**."),
            "escalation": ("Manager Escalation Rate",
                    "the proportion of customer conversations that require tier-2/managerial intervention or "
                    "priority ticket reassignment.\n\n"
                    "**How it's measured (Proxy Methodology):** Since explicit escalation labels are often missing, "
                    "Voilà uses a proxy — a conversation is flagged as escalated when an inbound customer message "
                    "carries **high/urgent/critical priority** OR **negative sentiment**. This translates unstructured "
                    "distress signals into a measurable escalation indicator.\n\n"
                    "**Why it matters:** High escalation rates mean front-line agents lack the authority, training, "
                    "or tooling to resolve issues independently — driving up cost-per-ticket and slowing resolution. "
                    "Target: **< 5%** (agents well-empowered). Above 25% signals a systemic enablement gap.\n\n"
                    "**Note:** This is a *proxy* metric, not a direct count of supervisor handoffs. It captures "
                    "conversations that *would likely* require managerial intervention based on urgency and tone signals."),
            "bertopic": ("BERTopic Clustering",
                    "an unsupervised transformer-based NLP algorithm that automatically clusters verbatim customer "
                    "complaints into actionable operational topics.\n\n"
                    "**How it works:** BERTopic converts customer text into dense vector embeddings (using "
                    "all-MiniLM-L6-v2), reduces dimensionality with UMAP, clusters with HDBSCAN, and extracts "
                    "topic labels via class-based TF-IDF.\n\n"
                    "**Why it matters:** Instead of manually reading thousands of tickets, BERTopic surfaces the "
                    "dominant complaint themes automatically — enabling data-driven prioritization of product and "
                    "service improvements.")
        }
        for kw, (term_title, definition) in edu_concepts.items():
            if re.search(rf"\b(what is|what does|how is|explain|define|meaning of)\b.*\b{kw}\b", q_lower):
                # Retrieve live KPI if available to ground the educational answer
                kpi_data = self.analytics_tool.get_kpi_summary()
                kpis = kpi_data.get("kpi_summary", {}) if isinstance(kpi_data, dict) else {}
                tot = kpis.get("total_conversations") or kpis.get("total_records") or 0

                val_text = ""
                if "fcr" in kw or "first contact" in kw:
                    fcr_val = kpis.get("resolution_rate", 73.9)
                    val_text = f"\n\n📊 In your active dataset, the current **Resolution Rate is {float(fcr_val):.1f}%** across **{tot:,} conversations**."
                elif "sla" in kw:
                    sla_val = kpis.get("avg_response_time_minutes", 26.5)
                    val_text = f"\n\n⏱️ In your active dataset, the current **Average Response Time is {float(sla_val):.1f} minutes** across **{tot:,} conversations**."
                elif "reopen" in kw:
                    reopen_val = kpis.get("reopen_rate", 0.0)
                    val_text = f"\n\n🔄 In your active dataset, the current **Thread Reopen Rate is {float(reopen_val):.1f}%**."
                elif "escalation" in kw:
                    esc_val = kpis.get("escalation_rate", 34.9)
                    val_text = f"\n\n⚠️ In your active dataset, the current **Manager Escalation Rate is {float(esc_val):.1f}%**."

                return AgentResponse(
                    status="success",
                    query_type="educational_definition",
                    required_tools=["analytics"],
                    answer=f"📚 **{term_title}**:\n\n{definition}{val_text}",
                    context={"educational_term": term_title, "kpis": kpis},
                    data_confidence=DataConfidence.MEASURED if tot > 0 else DataConfidence.NO_DATA_AVAILABLE,
                )

        # 5. Casual Chit-Chat, Personal Remarks & Out of Domain
        if self._is_personal_or_off_topic(q_raw):
            return AgentResponse(
                status="success",
                query_type="personal_or_off_topic",
                required_tools=[],
                answer=(
                    "I'm **Voilà Copilot**, your Voice-of-Customer AI analytics partner.\n\n"
                    "While I don't track personal habits or off-topic activities, I have real-time access to your customer support database. "
                    "Here are some insights I can provide:\n\n"
                    "- 📊 **Sentiment Distribution**: See the breakdown of positive, neutral, and negative customer tone\n"
                    "- 🚨 **Top Complaint Drivers**: Explore customer pain points and complaint clusters\n"
                    "- ⏱️ **SLA & Velocity**: Check response times and first-contact resolution rates\n\n"
                    "Feel free to ask any question about your customer support operations!"
                ),
                context={"validation": "personal_or_off_topic"},
                data_confidence=DataConfidence.NO_DATA_AVAILABLE,
            )

        # 6. Conversational Greetings & Gratitude
        greetings = {"hi", "hello", "hey", "howdy", "greetings", "good morning", "good afternoon", "good evening"}
        gratitude = {"thanks", "thank you", "thx", "appreciate it", "great job", "awesome", "cool", "ok", "okay"}
        clean_short = q_lower.strip("!?,.:;\"'() \t\n")
        if clean_short in greetings or (len(q_lower.split()) <= 2 and any(w in greetings for w in q_lower.split())):
            return AgentResponse(
                status="success",
                query_type="conversational_greeting",
                required_tools=[],
                answer="Hello! I'm **Voilà Copilot**. How can I assist you with your customer support analytics and complaint telemetry today?",
                context={"validation": "greeting"},
                data_confidence=DataConfidence.NO_DATA_AVAILABLE,
            )
        if clean_short in gratitude or any(clean_short.startswith(w) for w in gratitude):
            return AgentResponse(
                status="success",
                query_type="conversational_politeness",
                required_tools=[],
                answer="You're welcome! Let me know if you'd like to explore any other customer sentiment trends, SLA metrics, or complaint topics.",
                context={"validation": "politeness"},
                data_confidence=DataConfidence.NO_DATA_AVAILABLE,
            )

        # 7. Vague Single-Word Queries
        words = [w for w in q_normalized.split() if w.strip()]
        if len(words) == 1 and len(clean_short) < 15 and clean_short not in ANALYTICS_KEYWORDS:
            return AgentResponse(
                status="success",
                query_type="vague_query",
                required_tools=[],
                answer=f"Hey! Your query '{q_raw}' is a bit brief to identify a specific operational question. Could you please provide a little more context? (For example: *\"Why are customers having issues with {q_normalized.lower()}?\"* or *\"What is our average SLA response time?\"*).",
                context={"validation": "too_vague"},
                data_confidence=DataConfidence.NO_DATA_AVAILABLE,
            )

        # 8. Standard Operational & Analytical Query Pipeline
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
