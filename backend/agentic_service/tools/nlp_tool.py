from backend.agentic_service.nlp import (
    analyze_sentiment,
    detect_intent,
    extract_entities,
    extract_pain_points,
    extract_topics,
)


class NLPTool:
    """Replaceable interface for the external NLP engine."""

    def analyze_sentiment(self, conversations: list[str]) -> dict:
        return {"items": [analyze_sentiment(text) for text in conversations]}

    def detect_intent(self, conversations: list[str]) -> dict:
        return {"items": [detect_intent(text) for text in conversations]}

    def extract_topics(self, conversations: list[str]) -> dict:
        return {"items": [extract_topics(text) for text in conversations]}

    def extract_pain_points(self, conversations: list[str]) -> dict:
        return {"items": [extract_pain_points(text) for text in conversations]}

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
