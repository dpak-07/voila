import re
from typing import Optional, Set, Dict, Any, List
from backend.agentic_service.schemas.query import QueryRequest, QueryValidationResult


FIELD_REQUIREMENTS = {
    "response_time": {"created_at", "response_tweet_id", "in_response_to_tweet_id"},
    "sla_turnaround": {"created_at", "response_time_minutes"},
    "resolution_rate": {"resolution_status", "ticket_status"},
    "escalation_rate": {"escalation_status"},
    "reopen_rate": {"reopen_status", "status_history"},
    "fcr": {"first_contact_resolution", "contact_count"},
    "csat_proxy": {"sentiment"},
    "sentiment": {"text"},
    "sentiment_trend": {"text", "created_at"},
    "issue_trends": {"text", "created_at"},
    "emerging_issues": {"text", "created_at"},
    "recurring_issues": {"text", "created_at"},
    "priorities": {"text", "created_at"},
    "dimension_breakdowns": {"company", "text"},
    "root_cause_analysis": {"topic_keywords", "text"},
    "kpi_summary": {"created_at", "text"},
}

FIELD_ALIASES = {
    "conversation_text": {"conversation_text", "text", "message", "tweet_text", "clean_text"},
    "text": {"text", "conversation_text", "message", "tweet_text", "clean_text"},
    "response_tweet_id": {"response_tweet_id", "reply_tweet_id", "response_time_minutes", "average_response_time_minutes", "first_response_time_minutes"},
    "in_response_to_tweet_id": {"in_response_to_tweet_id", "parent_tweet_id", "response_time_minutes", "average_response_time_minutes", "first_response_time_minutes"},
    "response_time_minutes": {"response_time_minutes", "average_response_time_minutes", "first_response_time_minutes", "response_tweet_id"},
    "resolution_status": {"resolution_status", "resolution_flag", "resolved", "fcr"},
    "ticket_status": {"ticket_status", "resolution_status", "resolution_flag", "resolved", "fcr"},
    "escalation_status": {"escalation_status", "escalated", "escalation_flag", "priority", "sentiment"},
    "reopen_status": {"reopen_status", "reopened", "reopened_after_solution"},
    "status_history": {"status_history", "reopen_status", "reopened", "reopened_after_solution"},
    "first_contact_resolution": {"first_contact_resolution", "fcr", "resolution_flag", "resolved"},
    "contact_count": {"contact_count", "first_contact_resolution", "fcr", "resolution_flag", "resolved"},
    "topic_keywords": {"topic_keywords", "cluster_name", "pain_point", "topic"},
    "company": {"company", "brand", "author_id"},
}

# Unsupported business dimensions not present in customer support ticket telemetry
UNSUPPORTED_DOMAINS = [
    {
        "pattern": r"\b(revenue|profit|gross margin|ebitda|stock price|share price|dividend|financial earnings|market cap|quarterly earnings)\b",
        "domain": "Financial & Corporate Revenue",
        "explanation": "Financial revenue, corporate profit margins, and stock market prices are not tracked in customer support conversation logs.",
        "proxy_suggestion": "You can analyze customer complaint volumes and escalation rates on billing/refund issues to measure financial customer friction."
    },
    {
        "pattern": r"\b(salary|salaries|payroll|hourly wage|agent pay|employee compensation|staff bonus)\b",
        "domain": "Human Resources & Payroll",
        "explanation": "Support agent payroll, salary details, and internal employee compensation are not contained in the support telemetry dataset.",
        "proxy_suggestion": "You can inspect support operational efficiency metrics like Average Response Time, First-Contact Resolution (FCR), and turnaround velocity."
    },
    {
        "pattern": r"\b(website traffic|seo ranking|pageview|pageviews|bounce rate|ad spend|ad campaign|marketing conversion|click-through|ctr|cpc)\b",
        "domain": "Marketing & Web Analytics",
        "explanation": "Web traffic, SEO rankings, bounce rates, and marketing ad spend are external marketing metrics not present in support ticket records.",
        "proxy_suggestion": "You can examine customer-reported website and mobile app crash friction and usability complaints in our topic clusters."
    },
    {
        "pattern": r"\b(warehouse inventory|pallet stock|supply chain inventory count|supplier purchase order|raw material stock)\b",
        "domain": "Physical Inventory & Warehouse Supply",
        "explanation": "Direct physical warehouse inventory stock counts and procurement POs are not stored in customer interaction logs.",
        "proxy_suggestion": "You can analyze delivery delay complaints, shipment tracking friction, and carrier SLA breach metrics."
    },
    {
        "pattern": r"\b(cpu temperature|server gpu|motherboard clock|hardware wattage|fan speed)\b",
        "domain": "Hardware Sensor & Datacenter Infrastructure",
        "explanation": "Raw hardware datacenter telemetry and CPU thermal sensors are outside the scope of customer support datasets.",
        "proxy_suggestion": "You can review application crashes, server latency complaints, and outage spikes reported by end users."
    }
]

KNOWN_COMPANIES = ["amazon", "apple", "uber", "spotify", "netflix", "tesla", "delta", "google", "microsoft", "meta", "airasia", "swiggy", "zomato", "flipkart"]
KNOWN_REGIONS = ["apac", "emea", "na", "north america", "europe", "asia", "latam", "latin america", "us", "uk", "india", "australia", "canada", "germany"]
KNOWN_PRODUCTS = ["mobile app", "web", "ios", "android", "subscription", "premium", "pro", "billing", "delivery", "checkout", "login"]
KNOWN_TOPICS = [
    "billing", "refund", "charge", "invoice", "payment",
    "delivery", "shipping", "order", "track", "package", "courier",
    "crash", "freeze", "bug", "glitch", "stability", "error",
    "login", "password", "auth", "2fa", "otp", "account",
    "network", "wifi", "signal", "outage", "slow", "down",
    "cancel", "cancellation", "return", "exchange"
]


class QueryValidator:
    def validate(self, request: QueryRequest) -> QueryValidationResult:
        query = (request.question or "").lower().strip()

        # 1. Check for unsupported domain queries
        unsupported = self._check_unsupported_domains(query)
        if unsupported:
            return QueryValidationResult(
                status="insufficient_data",
                query_type="unsupported_domain_query",
                metrics_required=[],
                nlp_capabilities=[],
                contextual_requirements=[],
                time_period=request.time_period,
                company=request.company,
                product=request.product,
                region=request.region,
                can_answer=False,
                reason=(
                    f"⚠️ **Information Not Available in Support Dataset ({unsupported['domain']})**\n\n"
                    f"{unsupported['explanation']}\n\n"
                    f"**What is available:** Voilà contains customer support conversations, timestamps, SLA response times, "
                    f"sentiment analysis, topic clusters, resolution flags, and escalation records.\n\n"
                    f"💡 **Suggested Analytical Proxy:** {unsupported['proxy_suggestion']}"
                ),
                required_data=[unsupported["domain"]],
            )

        query_type = self._query_type(query)
        metrics = self._metrics_required(query, query_type)
        nlp_capabilities = self._nlp_capabilities(query, query_type)
        contextual_requirements = self._contextual_requirements(query, query_type)
        required_data = self._required_data(metrics, nlp_capabilities, contextual_requirements)
        missing = self._missing_fields(required_data, request.dataset_fields)

        extracted_year = self._extract_year(query)
        extracted_company = request.company or self._extract_entity(query, KNOWN_COMPANIES)
        extracted_region = request.region or self._extract_entity(query, KNOWN_REGIONS)
        extracted_product = request.product or self._extract_entity(query, KNOWN_PRODUCTS)
        extracted_topic = self._extract_topic(query)
        extracted_time_period = request.time_period or self._time_period(query)

        if missing:
            return QueryValidationResult(
                status="insufficient_data",
                query_type=query_type,
                metrics_required=metrics,
                nlp_capabilities=nlp_capabilities,
                contextual_requirements=contextual_requirements,
                time_period=extracted_time_period,
                year=extracted_year,
                company=extracted_company,
                product=extracted_product,
                region=extracted_region,
                topic=extracted_topic,
                can_answer=False,
                reason=f"Required dataset fields are missing: {', '.join(missing)}",
                required_data=missing,
            )

        return QueryValidationResult(
            status="valid",
            query_type=query_type,
            metrics_required=metrics,
            nlp_capabilities=nlp_capabilities,
            contextual_requirements=contextual_requirements,
            time_period=extracted_time_period,
            year=extracted_year,
            company=extracted_company,
            product=extracted_product,
            region=extracted_region,
            topic=extracted_topic,
            can_answer=True,
        )

    def _check_unsupported_domains(self, query: str) -> Optional[Dict[str, str]]:
        for item in UNSUPPORTED_DOMAINS:
            if re.search(item["pattern"], query):
                return item
        return None

    def _query_type(self, query: str) -> str:
        # Comparison / Delta
        if any(w in query for w in ["compare", "comparison", "versus", "vs", "year over year", "run over run", "delta", "how did metrics change"]):
            return "comparative_delta"

        # Executive Dashboard & Overview
        if any(w in query for w in ["dashboard", "executive summary", "executive overview", "full report", "system overview"]):
            return "executive_dashboard"

        # SLA Turnaround Triage & Tiers
        if any(w in query for w in ["turnaround", "sla tier", "sla tiers", "<15m", "15-60m", "1-4h", ">4h", "breach", "breaches", "latency tier", "speed tier"]):
            return "sla_turnaround"

        # Response Time
        if any(w in query for w in ["response time", "sla", "wait time", "latency", "how fast", "how long do customers wait", "reply speed"]):
            return "response_time"

        # Reopen Rate
        if any(w in query for w in ["reopen", "reopened", "repeat contact", "multiple touch", "re-opened"]):
            return "reopen_rate"

        # Resolution & FCR
        if any(w in query for w in ["first contact", "first response resolution", "fcr", "single touch", "single contact"]):
            return "fcr"
        if any(w in query for w in ["resolution", "resolve", "resolved", "solved", "closed"]):
            return "resolution_rate"

        # Escalation Rate
        if any(w in query for w in ["escalation", "escalat", "tier-2", "tier 2", "manager transfer", "supervisor"]):
            return "escalation_rate"

        # CSAT / Satisfaction
        if any(w in query for w in ["csat", "satisfaction", "happy", "happiness", "satisfaction score"]):
            return "csat_proxy"

        # Sentiment Distribution & Trajectory
        if any(w in query for w in ["sentiment trend", "sentiment trajectory", "tone trend", "sentiment over time", "positive vs negative", "daily sentiment", "weekly sentiment"]):
            return "sentiment_trend"
        if any(w in query for w in ["sentiment", "positive tone", "negative tone", "neutral tone", "customer mood", "customer tone", "sentiment breakdown"]):
            return "sentiment_analysis"

        # Root Cause Analysis
        if any(w in query for w in ["root cause", "why are customers", "why do customers", "what causes", "underlying cause", "failure mode", "why is sentiment"]):
            return "root_cause_analysis"

        # Spikes & Anomalies
        if any(w in query for w in ["spike", "spikes", "surge", "anomaly", "anomalies", "sudden increase", "outlier", "z-score"]):
            return "emerging_spikes"
        if any(w in query for w in ["recurring", "chronic", "persisting", "continuous issue"]):
            return "recurring_issues"

        # Prioritization & P0
        if any(w in query for w in ["priority", "prioritize", "p0", "p1", "p2", "p3", "critical issue", "urgent", "top issue"]):
            return "issue_prioritization"

        # Strategic Recommendations
        if any(w in query for w in ["recommend", "recommendation", "recommendations", "action plan", "what should we do", "next steps", "remediation"]):
            return "strategic_recommendations"

        # Specific Topic Deep Dive (Billing, Delivery, Crash, Login, Refund)
        if any(t in query for t in KNOWN_TOPICS) and not any(k in query for k in ["list all", "all topics", "top categories"]):
            return "topic_deepdive"

        # Topic Clusters / Pain Points
        if any(w in query for w in [
            "cluster", "clusters", "topic", "topics", "category", "categories",
            "complain", "complaints", "pain point", "pain points", "problem", "problems",
            "top issue", "top issues", "friction", "dissatisfaction", "what are the main"
        ]):
            return "customer_pain_points"

        # Dimensional Comparison (Brand, Region, Product)
        if any(w in query for w in ["brand", "company", "companies", "region", "regional", "product", "products", "by country", "by market", "breakdown by"]):
            return "dimension_comparison"

        # Verbatim Examples / Quotes
        if any(w in query for w in ["example", "examples", "quote", "quotes", "verbatim", "sample conversation", "show me ticket", "sample ticket"]):
            return "conversation_examples"

        # KPI Summary / General Overview
        if any(w in query for w in ["kpi", "kpis", "summary", "overview", "metrics", "stats", "statistics", "numbers", "scorecard"]):
            return "kpi_summary"

        return "general_insight"

    def _metrics_required(self, query: str, query_type: str) -> list[str]:
        mapping = {
            "response_time": ["response_time"],
            "sla_turnaround": ["sla_turnaround", "response_time"],
            "reopen_rate": ["reopen_rate"],
            "resolution_rate": ["resolution_rate"],
            "escalation_rate": ["escalation_rate"],
            "fcr": ["fcr", "resolution_rate"],
            "csat_proxy": ["csat_proxy", "kpi_summary"],
            "sentiment_analysis": ["sentiment", "kpi_summary"],
            "sentiment_trend": ["sentiment_trend", "issue_trends"],
            "emerging_spikes": ["emerging_issues", "issue_trends"],
            "recurring_issues": ["recurring_issues"],
            "issue_prioritization": ["priorities", "cluster_sentiment_stats"],
            "root_cause_analysis": ["root_causes", "priorities", "cluster_sentiment_stats"],
            "strategic_recommendations": ["solution_impact", "priorities"],
            "topic_deepdive": ["customer_pain_points", "priorities", "cluster_sentiment_stats"],
            "customer_pain_points": ["priorities", "emerging_issues", "recurring_issues", "cluster_sentiment_stats"],
            "dimension_comparison": ["dimension_breakdowns", "kpi_summary"],
            "comparative_delta": ["comparative_delta", "kpi_summary"],
            "executive_dashboard": ["kpi_summary", "response_time", "sla_turnaround", "sentiment_trend", "issue_trends", "priorities", "root_causes", "dimension_breakdowns"],
            "kpi_summary": ["kpi_summary", "response_time", "resolution_rate"],
        }
        return mapping.get(query_type, ["kpi_summary"])

    def _nlp_capabilities(self, query: str, query_type: str) -> list[str]:
        if query_type in {"customer_pain_points", "topic_deepdive", "root_cause_analysis", "emerging_spikes", "executive_dashboard", "sentiment_trend", "issue_prioritization"}:
            return ["sentiment", "intent", "topics", "pain_points", "entities"]
        if query_type in {"conversation_examples", "sentiment_analysis"}:
            return ["sentiment", "intent", "topics"]
        return []

    def _contextual_requirements(self, query: str, query_type: str) -> list[str]:
        if query_type in {"conversation_examples", "topic_deepdive"}:
            return ["similar_complaints", "customer_conversations"]
        if query_type in {"customer_pain_points", "root_cause_analysis", "executive_dashboard"}:
            return ["customer_conversations", "issue_context"]
        if "product" in query:
            return ["product_context"]
        return []

    def _required_data(
        self,
        metrics: list[str],
        nlp_capabilities: list[str],
        contextual_requirements: list[str],
    ) -> list[str]:
        required: set[str] = set()
        for metric in metrics:
            required.update(FIELD_REQUIREMENTS.get(metric, set()))
        if nlp_capabilities or contextual_requirements:
            required.add("text")
        return sorted(required)

    def _missing_fields(self, required_data: list[str], dataset_fields: list[str]) -> list[str]:
        if not dataset_fields:
            return []
        available = {field.lower() for field in dataset_fields}
        return [field for field in required_data if not self._field_available(field, available)]

    def _field_available(self, required_field: str, available: set[str]) -> bool:
        aliases = FIELD_ALIASES.get(required_field, {required_field})
        return bool({alias.lower() for alias in aliases} & available)

    def _extract_year(self, query: str) -> Optional[int]:
        year_match = re.search(r"\b(201[0-9]|202[0-9])\b", query)
        if year_match:
            return int(year_match.group(1))
        return None

    def _extract_entity(self, query: str, candidates: list[str]) -> Optional[str]:
        for c in candidates:
            if re.search(r"\b" + re.escape(c) + r"\b", query, re.IGNORECASE):
                return c.title()
        return None

    def _extract_topic(self, query: str) -> Optional[str]:
        for t in KNOWN_TOPICS:
            if re.search(r"\b" + re.escape(t) + r"\b", query, re.IGNORECASE):
                return t
        return None

    def _time_period(self, query: str) -> Optional[str]:
        for phrase in ("today", "this week", "last week", "this month", "last month", "monthly", "weekly", "daily", "yearly", "overall"):
            if phrase in query:
                return phrase
        return None
