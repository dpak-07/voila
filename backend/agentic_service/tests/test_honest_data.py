import pandas as pd
import numpy as np
import pytest

from backend.agentic_service.schemas.confidence import DataConfidence
from backend.agentic_service.schemas.query import QueryRequest
from backend.agentic_service.tools.snowflake_tool import SnowflakeTool
from backend.agentic_service.tools.vector_db_tool import VectorDBTool
from backend.agentic_service.tools.analytics_tool import AnalyticsTool
from backend.agentic_service.agent.agent import AgenticService
from backend.agentic_service.agent.result_validator import ResultValidator
from backend.agentic_service.bedrock.client import BedrockClient
from backend.algorithms.metrics_calculator import MetricsCalculator
from backend.algorithms.analytics_engine import AnalyticsEngine


def test_metrics_calculator_response_times_no_hardcoded_143():
    calc = MetricsCalculator()
    # Create 55,000 rows (exceeds the old 50,000 threshold)
    n = 55000
    base_time = pd.Timestamp("2026-08-15 10:00:00")
    df = pd.DataFrame({
        "tweet_id": list(range(1, n + 1)),
        "author_id": ["user" if i % 2 == 1 else "agent" for i in range(1, n + 1)],
        "inbound": [True if i % 2 == 1 else False for i in range(1, n + 1)],
        "created_at": [base_time + pd.Timedelta(minutes=i * 2) for i in range(1, n + 1)],
        # Even numbered tweets are responses to previous odd numbered tweets (taking 2 mins)
        "response_tweet_id": [str(i + 1) if i % 2 == 1 else None for i in range(1, n + 1)],
    })

    resp_times = calc.calculate_response_times(df)
    # The actual computed response time should be exactly 2.0 minutes for odd rows, never 143.8
    odd_times = resp_times.iloc[::2].dropna()
    assert len(odd_times) > 0
    assert np.allclose(odd_times.values, 2.0)
    assert not np.any(np.isclose(odd_times.values, 143.8))


def test_metrics_calculator_conversation_metrics_no_proxy_formulas():
    calc = MetricsCalculator()
    # Create 6,000 rows (exceeds the old 5,000 threshold)
    n = 6000
    # Create 2000 conversations of 3 messages each
    # msg 1: customer inbound, normal sentiment (10:00)
    # msg 2: agent response (10:05)
    # msg 3: agent resolved confirmation (10:10)
    conv_ids = []
    inbound_flags = []
    sentiments = []
    priorities = []
    created_ats = []
    base_time = pd.Timestamp("2026-08-15 10:00:00")

    for c in range(2000):
        conv_ids.extend([f"c_{c}", f"c_{c}", f"c_{c}"])
        inbound_flags.extend([True, False, False])
        sentiments.extend(["neutral", "neutral", "positive"])
        priorities.extend(["normal", "normal", "normal"])
        created_ats.extend([
            base_time + pd.Timedelta(minutes=c * 10),
            base_time + pd.Timedelta(minutes=c * 10 + 5),
            base_time + pd.Timedelta(minutes=c * 10 + 10),
        ])

    df = pd.DataFrame({
        "tweet_id": list(range(1, n + 1)),
        "conversation_id": conv_ids,
        "inbound": inbound_flags,
        "sentiment": sentiments,
        "priority": priorities,
        "created_at": created_ats,
    })

    conv_stats = calc.calculate_conversation_metrics(df, conversation_id_col="conversation_id")
    # All 2000 conversations ended with an agent message -> 100% resolved
    resolved_mean = conv_stats["resolved"].mean()
    assert resolved_mean == 1.0  # Real computation, not proxy max(0.2, 0.47)
    # None escalated or reopened
    assert conv_stats["escalated"].mean() == 0.0
    assert conv_stats["reopened"].mean() == 0.0


def test_snowflake_tool_returns_no_data_available_instead_of_placeholders():
    tool = SnowflakeTool()
    # Non-existent filter criteria
    res = tool.get_kpi_data(company="non_existent_company_xyz_999")
    if res.get("status") == "no_data_available":
        assert res["data_status"] == DataConfidence.NO_DATA_AVAILABLE.value
        assert "no kpi data available" in res["reason"].lower()
    else:
        # If real DB matches, tickets must not be fake 1280
        assert res.get("kpi_data", {}).get("tickets") != 1280

    # Sentiment trend
    sent_res = tool.get_sentiment_trend(company="non_existent_company_xyz_999")
    if sent_res.get("status") == "no_data_available":
        assert sent_res["data_status"] == DataConfidence.NO_DATA_AVAILABLE.value
        assert "previous_negative_sentiment" not in sent_res
    else:
        assert sent_res.get("previous_negative_sentiment") != 24.8

    # Issue volume
    vol_res = tool.get_issue_volume(company="non_existent_company_xyz_999")
    if vol_res.get("status") == "no_data_available":
        assert vol_res["data_status"] == DataConfidence.NO_DATA_AVAILABLE.value
        assert vol_res["issue_volume"] == []
    else:
        assert vol_res.get("issue_volume") != [{"issue": "app_crash", "count": 148}]


def test_vector_db_tool_returns_empty_when_no_match():
    tool = VectorDBTool()
    # Query something impossible to match with a non-existent company filter
    res = tool._query_sql("xyzunlikelyword123456789", limit=5, company="non_existent_corp_999")
    # Must NOT contain the old hardcoded strings
    assert "The app keeps crashing after login." not in res
    assert "The latest update made the application unstable." not in res


def test_analytics_tool_propagates_data_confidence():
    tool = AnalyticsTool()
    res = tool.get_kpi_summary(company="non_existent_company_abc_888")
    assert "data_status" in res
    assert res["data_status"] in [DataConfidence.MEASURED.value, DataConfidence.NO_DATA_AVAILABLE.value]


def test_analytics_engine_empty_df_returns_no_data_available():
    engine = AnalyticsEngine()
    empty_res = engine.calculate_all_15_metrics(pd.DataFrame())
    assert empty_res["status"] == "no_data_available"
    assert empty_res["data_status"] == DataConfidence.NO_DATA_AVAILABLE.value
    assert empty_res["kpi_metrics"]["total_records"] == 0

    # Dynamic multi-period trends on empty df
    trend_res = engine.calculate_multi_period_trends(pd.DataFrame())
    assert trend_res["trends"] == {}


def test_analytics_engine_multi_period_trends_no_hardcoded_85_resolution():
    engine = AnalyticsEngine()
    df = pd.DataFrame({
        "created_at": ["2026-08-01 10:00:00", "2026-08-01 11:00:00"],
        "sentiment": ["positive", "positive"],
        "fcr": [True, False],  # 50% resolution
        "response_time_minutes": [10.0, 20.0],
    })
    trend_res = engine.calculate_multi_period_trends(df, granularity="daily")
    day_trend = trend_res["trends"]["2026-08-01"]
    assert day_trend["resolution_rate"] == 50.0  # Real 50%, not 85.0


def test_result_validator_detects_no_data_available():
    validator = ResultValidator()
    results = {
        "analytics": {
            "status": "no_data_available",
            "reason": "No records found.",
        }
    }
    issues = validator.validate(results, ["analytics"])
    assert len(issues) > 0
    assert any(issue.data_status == "no_data_available" for issue in issues)


def test_agent_with_insufficient_data_returns_no_data_confidence():
    agent = AgenticService(bedrock_client=BedrockClient(use_mock=True))
    response = agent.answer(
        QueryRequest(
            question="What is the reopen rate?",
            dataset_fields=["tweet_id", "text"],
        )
    )
    assert response.status == "insufficient_data"
    assert response.data_confidence == DataConfidence.NO_DATA_AVAILABLE
