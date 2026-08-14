from backend.agentic_service.nlp import (
    analyze_sentiment,
    detect_intent,
    extract_entities,
    extract_pain_points,
    extract_topics,
)
from backend.algorithms.analytics_engine import AnalyticsEngine

class NLPTool:
    """Interface for the NLP and topic extraction engine."""

    def __init__(self):
        self.engine = AnalyticsEngine()

    def analyze_sentiment(self, conversations: list[str]) -> dict:
        analysis = self.engine.run_dynamic_analysis()
        dist = analysis.get("sentiment_distribution", {})
        return {"items": [analyze_sentiment(text) for text in conversations], "distribution": dist}

    def detect_intent(self, conversations: list[str]) -> dict:
        return {"items": [detect_intent(text) for text in conversations]}

    def extract_topics(self, conversations: list[str]) -> dict:
        analysis = self.engine.run_dynamic_analysis()
        topics = [t.get("topic_keywords", "") for t in analysis.get("topic_summaries", []) if t.get("topic_keywords")]
        base_items = [extract_topics(text) for text in conversations]
        if topics:
            return {"items": base_items, "active_clusters": topics}
        return {"items": base_items}

    def extract_pain_points(self, conversations: list[str]) -> dict:
        analysis = self.engine.run_dynamic_analysis()
        pain_points = [t.get("topic_keywords", "") for t in analysis.get("customer_pain_points", []) if t.get("topic_keywords")]
        base_items = [extract_pain_points(text) for text in conversations]
        return {"items": base_items, "top_pain_points": pain_points}

    def extract_entities(self, conversations: list[str]) -> dict:
        return {"items": [extract_entities(text) for text in conversations]}

    def run(self, capabilities: list[str], conversations: list[str]) -> dict:
        handlers = {
            "sentiment": self.analyze_sentiment,
            "intent": self.detect_intent,
            "topics": self.extract_topics,
            "pain_points": self.extract_pain_points,
            "entities": self.extract_entities,
        }
        return {
            capability: handlers[capability](conversations)
            for capability in capabilities
            if capability in handlers
        }
