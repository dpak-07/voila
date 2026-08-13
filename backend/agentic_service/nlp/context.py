from .entity import extract_entities
from .intent import detect_intent
from .sentiment import analyze_sentiment
from .topic import extract_pain_points, extract_topics


def extract_context(text: str) -> dict:
    return {
        "sentiment": analyze_sentiment(text),
        "intent": detect_intent(text),
        "topic": extract_topics(text),
        "pain_point": extract_pain_points(text),
        "entities": extract_entities(text),
    }
