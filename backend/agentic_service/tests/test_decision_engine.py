from backend.agentic_service.agent.decision_engine import DecisionEngine
from backend.agentic_service.agent.query_validator import QueryValidator
from backend.agentic_service.schemas.query import QueryRequest


def decide(question: str):
    validation = QueryValidator().validate(QueryRequest(question=question))
    return DecisionEngine().decide(validation)


def test_response_time_selects_analytics_and_snowflake_only():
    decision = decide("What is the average response time?")

    assert decision.required_tools == ["analytics", "snowflake"]
    assert decision.required_actions["analytics"] == ["response_time"]


def test_customer_complaints_selects_nlp_and_vector_db():
    decision = decide("What are customers complaining about?")

    assert decision.required_tools == ["nlp", "vector_db"]
    assert decision.required_actions["nlp"] == ["sentiment", "intent", "topics", "pain_points", "entities"]


def test_negative_sentiment_driver_selects_all_needed_tools():
    decision = decide("Why did negative sentiment increase this week?")

    assert decision.required_tools == ["analytics", "snowflake", "nlp", "vector_db"]
    assert "sentiment_trend" in decision.required_actions["snowflake"]


def test_executive_dashboard_selects_common_agentic_flow_tools():
    decision = decide("Create the executive summary dashboard for our service outcome")

    assert decision.query_type == "executive_dashboard"
    assert decision.required_tools == ["analytics", "snowflake", "nlp", "vector_db"]
    assert "response_time" in decision.required_actions["analytics"]
    assert "sentiment_trend" in decision.required_actions["snowflake"]
