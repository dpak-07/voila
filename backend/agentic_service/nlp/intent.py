import re


INTENT_KEYWORDS = {
    "billing": ("bill", "invoice", "charge", "payment"),
    "login": ("login", "password", "sign in", "account access"),
    "refund": ("refund", "return", "money back"),
    "delivery": ("delivery", "shipment", "late", "package"),
    "technical_issue": ("crash", "crashing", "bug", "error", "broken", "unstable"),
    "cancellation": ("cancel", "subscription"),
    "account_issue": ("account", "profile", "locked"),
}


def detect_intent(text: str) -> dict:
    lowered = text.lower()
    for intent, keywords in INTENT_KEYWORDS.items():
        if any(_contains_keyword(lowered, keyword) for keyword in keywords):
            return {"intent": intent, "confidence": 0.88}
    return {"intent": "general_support", "confidence": 0.65}


def _contains_keyword(text: str, keyword: str) -> bool:
    pattern = r"(?<!\w)" + re.escape(keyword) + r"(?!\w)"
    return re.search(pattern, text) is not None
