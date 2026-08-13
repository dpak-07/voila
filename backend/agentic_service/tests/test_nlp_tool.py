from backend.agentic_service.tools.nlp_tool import NLPTool


def test_nlp_tool_exposes_mock_capabilities():
    result = NLPTool().run(
        ["sentiment", "intent", "topics", "pain_points", "entities"],
        ["The app keeps crashing after the latest update."],
    )

    assert result["sentiment"]["items"][0]["sentiment"] == "negative"
    assert result["intent"]["items"][0]["intent"] == "technical_issue"
    assert result["topics"]["items"][0]["topic"] == "app_crash"
    assert result["pain_points"]["items"][0]["pain_point"] == "application instability"
    assert result["entities"]["items"][0]["product"] == "mobile app"
