import pytest
import pandas as pd
from backend.algorithms.text_cleaner import TextCleaner
from backend.algorithms.topic_clustering import TopicClusterer
from backend.algorithms.spike_detector import SpikeDetector
from backend.algorithms.metrics_calculator import MetricsCalculator
from backend.algorithms.sentiment_analyzer import SentimentAnalyzer

def test_sentiment_analyzer():
    analyzer = SentimentAnalyzer()
    res_neg = analyzer.analyze("The app keeps crashing and it is extremely frustrating.")
    res_pos = analyzer.analyze("Thanks for the helpful customer representative, problem is fixed!")
    assert res_neg["sentiment"] == "negative"
    assert res_pos["sentiment"] == "positive"

def test_text_cleaner():
    cleaner = TextCleaner()
    raw = "@Support My internet is down! Check http://status.telecomcorp.com"
    clean_text = cleaner.clean(raw)
    assert "internet is down" in clean_text
    assert "@Support" not in clean_text
    assert "http" not in clean_text

def test_topic_clustering_fallback():
    clusterer = TopicClusterer(n_topics=2)
    docs = [
        "app keeps crashing",
        "latest update is unstable and crashes",
        "need a refund duplicate charge",
        "double charged twice on invoice"
    ]
    topics, keywords = clusterer.fit_predict(docs)
    assert len(topics) == 4
    assert len(keywords) == 4
    # Ensure they clustered into exactly 2 groups (n_topics=2)
    assert len(set(topics)) == 2

def test_spike_detector():
    detector = SpikeDetector(window_size=2)
    data = {
        "date": [
            pd.Timestamp("2026-08-01"), pd.Timestamp("2026-08-02"), pd.Timestamp("2026-08-03"),
            pd.Timestamp("2026-08-01"), pd.Timestamp("2026-08-02"), pd.Timestamp("2026-08-03")
        ],
        "category": ["crash", "crash", "crash", "billing", "billing", "billing"],
        "daily_volume": [2, 2, 25, 5, 5, 5] # Crash has a huge spike on day 3
    }
    df = pd.DataFrame(data)
    df_spikes = detector.detect_spikes(df, "date", "category", "daily_volume")
    
    # Assert spike is detected on day 3 for crash
    crash_day3 = df_spikes[(df_spikes["category"] == "crash") & (df_spikes["date"] == pd.Timestamp("2026-08-03"))]
    assert crash_day3["spike_detected"].values[0] == True
    
    # Billing should have no spike
    billing_day3 = df_spikes[(df_spikes["category"] == "billing") & (df_spikes["date"] == pd.Timestamp("2026-08-03"))]
    assert billing_day3["spike_detected"].values[0] == False

def test_metrics_calculator():
    calculator = MetricsCalculator()
    data = {
        "tweet_id": [1, 2, 3, 4],
        "author_id": ["c1", "a1", "c1", "a1"],
        "inbound": [True, False, True, False],
        "created_at": [
            "2026-08-10T10:00:00Z", "2026-08-10T10:05:00Z",
            "2026-08-10T10:15:00Z", "2026-08-10T10:20:00Z"
        ],
        "response_tweet_id": [2, None, 4, None],
        "in_response_to_tweet_id": [None, 1, 2, 3],
        "priority": ["normal", "normal", "high", "normal"],
        "sentiment": ["neutral", "neutral", "negative", "neutral"],
        "conversation_id": ["1", "1", "1", "1"]
    }
    df = pd.DataFrame(data)
    
    # Calculate response times
    resp_times = calculator.calculate_response_times(df)
    assert resp_times[0] == 5.0  # c1 -> a1 took 5 minutes
    
    # Calculate conversation level stats
    conv_stats = calculator.calculate_conversation_metrics(df, "conversation_id")
    assert conv_stats["resolved"].values[0] == True
    assert conv_stats["escalated"].values[0] == True
    assert conv_stats["reopened"].values[0] == True
