from backend.agentic_service.agent.agent import AgenticService
from backend.agentic_service.bedrock.client import BedrockClient
from backend.agentic_service.schemas.query import QueryRequest


def test_agent_returns_grounded_response_for_customer_complaints():
    response = AgenticService(bedrock_client=BedrockClient(use_mock=True)).answer(
        QueryRequest(question="What are customers complaining about?")
    )

    assert response.status == "success"
    assert response.required_tools == ["nlp", "vector_db"]
    assert "Validated NLP context" in response.answer
    assert response.context["customer_context"]


def test_agent_does_not_generate_answer_for_insufficient_data():
    response = AgenticService(bedrock_client=BedrockClient(use_mock=True)).answer(
        QueryRequest(question="What is the reopen rate?", dataset_fields=["conversation_text"])
    )

    assert response.status == "insufficient_data"
    assert "Required data is not available" in response.answer
