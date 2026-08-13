def extract_topics(text: str) -> dict:
    lowered = text.lower()
    if "crash" in lowered or "unstable" in lowered:
        return {"topic": "app_crash", "keywords": ["app", "crashing", "latest update"]}
    if "login" in lowered or "password" in lowered:
        return {"topic": "login_problem", "keywords": ["login", "password", "access"]}
    if "refund" in lowered:
        return {"topic": "refund_request", "keywords": ["refund", "return"]}
    return {"topic": "general_support", "keywords": []}


def extract_pain_points(text: str) -> dict:
    lowered = text.lower()
    if "crash" in lowered or "unstable" in lowered:
        return {"pain_point": "application instability", "severity": "high"}
    if "login" in lowered or "password" in lowered:
        return {"pain_point": "account access friction", "severity": "medium"}
    if "refund" in lowered or "charge" in lowered:
        return {"pain_point": "billing or refund friction", "severity": "medium"}
    return {"pain_point": "unspecified support friction", "severity": "low"}
