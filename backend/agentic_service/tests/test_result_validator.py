from backend.agentic_service.agent.result_validator import ResultValidator


def test_result_validator_rejects_missing_required_tool_output():
    issues = ResultValidator().validate({}, ["nlp"])

    assert issues
    assert issues[0].field == "nlp"


def test_result_validator_rejects_low_nlp_confidence():
    results = {"nlp": {"sentiment": {"items": [{"sentiment": "negative", "confidence": 0.2}]}}}

    issues = ResultValidator(min_nlp_confidence=0.6).validate(results, ["nlp"])

    assert issues
    assert issues[0].field == "nlp.sentiment"
