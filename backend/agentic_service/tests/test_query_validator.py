from backend.agentic_service.agent.query_validator import QueryValidator
from backend.agentic_service.schemas.query import QueryRequest


def test_response_time_does_not_require_nlp():
    result = QueryValidator().validate(QueryRequest(question="What is the average response time?"))

    assert result.status == "valid"
    assert result.query_type == "response_time"
    assert result.metrics_required == ["response_time"]
    assert result.nlp_capabilities == []


def test_reopen_rate_reports_insufficient_data_when_fields_are_missing():
    request = QueryRequest(
        question="What is the reopen rate?",
        dataset_fields=["ticket_id", "conversation_text"],
    )

    result = QueryValidator().validate(request)

    assert result.status == "insufficient_data"
    assert result.can_answer is False
    assert "reopen_status" in result.required_data
    assert "status_history" in result.required_data


def test_customer_complaints_require_nlp_and_context():
    result = QueryValidator().validate(QueryRequest(question="What are customers complaining about?"))

    assert result.query_type == "customer_pain_points"
    assert result.nlp_capabilities == ["sentiment", "intent", "topics", "pain_points", "entities"]
    assert result.contextual_requirements == ["customer_conversations", "issue_context"]


def test_kaggle_twitter_columns_can_support_response_time_and_nlp_flow():
    kaggle_fields = [
        "tweet_id",
        "author_id",
        "inbound",
        "created_at",
        "text",
        "response_tweet_id",
        "in_response_to_tweet_id",
    ]

    response_time = QueryValidator().validate(
        QueryRequest(question="What is the average response time?", dataset_fields=kaggle_fields)
    )
    complaints = QueryValidator().validate(
        QueryRequest(question="What are customers complaining about?", dataset_fields=kaggle_fields)
    )

    assert response_time.status == "valid"
    assert complaints.status == "valid"


def test_kaggle_twitter_columns_do_not_support_true_resolution_rate():
    kaggle_fields = [
        "tweet_id",
        "author_id",
        "inbound",
        "created_at",
        "text",
        "response_tweet_id",
        "in_response_to_tweet_id",
    ]

    result = QueryValidator().validate(QueryRequest(question="What is the resolution rate?", dataset_fields=kaggle_fields))

    assert result.status == "insufficient_data"
    assert "resolution_status" in result.required_data
    assert "ticket_status" in result.required_data
