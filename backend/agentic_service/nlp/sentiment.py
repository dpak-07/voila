def analyze_sentiment(text: str) -> dict:
    lowered = text.lower()
    negative_terms = ("crash", "angry", "bad", "complain", "problem", "issue", "refund")
    positive_terms = ("great", "resolved", "helpful", "thanks")

    if any(term in lowered for term in negative_terms):
        return {"sentiment": "negative", "confidence": 0.9}
    if any(term in lowered for term in positive_terms):
        return {"sentiment": "positive", "confidence": 0.82}
    return {"sentiment": "neutral", "confidence": 0.7}
