def extract_entities(text: str) -> dict:
    lowered = text.lower()
    entities: dict[str, str] = {}

    if "ios" in lowered or "iphone" in lowered:
        entities["platform"] = "iOS"
    elif "android" in lowered:
        entities["platform"] = "Android"
    elif "web" in lowered:
        entities["platform"] = "web"

    if "app" in lowered:
        entities["product"] = "mobile app"
    if "login" in lowered:
        entities["issue"] = "login problem"
    elif "crash" in lowered:
        entities["issue"] = "app crash"
    if "this week" in lowered:
        entities["date"] = "this week"

    return entities
