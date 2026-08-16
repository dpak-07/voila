import re
from typing import Dict, List, Set, Tuple

# Comprehensive domain-aware vocabulary for customer service, technical diagnostics, and general queries
_SUPPORT_VOCABULARY = {
    # Pronouns, Conjunctions & Prepositions
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", 
    "he", "him", "his", "she", "her", "hers", "it", "its", "they", "them", "their", "theirs",
    "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are", 
    "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", 
    "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until", 
    "while", "of", "at", "by", "for", "with", "about", "against", "between", "into", 
    "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", 
    "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", 
    "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", 
    "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", 
    "than", "too", "very", "can", "will", "just", "don", "should", "now", "cannot", "could",
    "would", "might", "must", "keep", "keeps", "kept", "keeping", "always", "never", "still",
    "often", "sometimes", "really", "please", "help", "need", "want", "trying", "tried", 
    "getting", "got", "give", "tell", "show", "explain", "check", "find", "look", "since",
    "hey", "hi", "hello", "howdy", "greetings", "morning", "afternoon", "evening", "thanks", "thank", 
    "welcome", "yes", "yeah", "yep", "no", "nah", "nope", "ok", "okay", "cool", "sure", "fine", "doing",
    "today", "yesterday", "tomorrow", "tonight", "who", "what", "where", "why", "how",
    
    # Devices & Hardware
    "phone", "phones", "mobile", "cellphone", "smartphone", "iphone", "android", "device", 
    "devices", "tablet", "ipad", "laptop", "computer", "screen", "display", "battery", 
    "charger", "charging", "cable", "port", "sim", "card", "speaker", "camera", "mic", 
    "microphone", "headphone", "headphones", "earbuds", "audio", "hardware",

    # Software, Apps & Connectivity
    "app", "apps", "application", "software", "update", "updates", "updated", "updating", 
    "upgrade", "upgrades", "upgraded", "upgrading", "version", "patch", "install", "installed", 
    "installing", "download", "downloaded", "downloading", "reboot", "restart", "restarted", 
    "reset", "resetting", "wifi", "wi-fi", "bluetooth", "network", "signal", "internet", 
    "connect", "connects", "connection", "connected", "connecting", "disconnect", "disconnected", "disconnecting", "disconnects", "offline", "online", 
    "data", "cellular", "broadband", "router", "modem", "login", "logging", "logout", 
    "password", "passcode", "auth", "authentication", "account", "profile", "settings",

    # Symptoms, Bugs & Friction
    "freezing", "freeze", "freezes", "frozen", "crashing", "crash", "crashed", "crashes", 
    "hanging", "hang", "hangs", "stuck", "slow", "slowing", "slowly", "lag", "lagging", 
    "latency", "delay", "delayed", "delays", "failing", "fail", "failed", "fails", "failure", 
    "error", "errors", "broken", "breaking", "dropped", "heating", "overheating", "hot", 
    "draining", "drain", "drains", "drained", "die", "dies", "died", "dying", "dead", "glitch", "glitches", "bug", "bugs", "malfunction", "unresponsive", 
    "blackout", "blank", "unstable", "poor", "bad", "terrible", "worst", "horrible", "awful",
    "pain", "pains", "point", "points", "root", "cause", "causes", "friction",

    # Orders, Shipping & Delivery
    "order", "orders", "ordered", "ordering", "delivery", "deliveries", "delivered", "delivering", 
    "shipment", "shipping", "shipped", "package", "parcel", "courier", "tracking", "track", 
    "tracked", "carrier", "transit", "delayed", "lost", "missing", "damaged", "wrong", 
    "item", "items", "product", "products", "purchase", "purchased", "dispatch", "dispatched",

    # Billing, Payments & Accounts
    "billing", "bill", "bills", "billed", "invoice", "invoices", "payment", "payments", 
    "paid", "pay", "paying", "charge", "charged", "charges", "charging", "overcharge", 
    "overcharged", "refund", "refunds", "refunded", "refunding", "return", "returns", 
    "returned", "returning", "cancellation", "cancel", "canceled", "cancelled", "canceling", 
    "cancelling", "subscription", "plan", "plans", "fee", "fees", "credit", "balance",

    # Customer Service, SLAs & Operational Telemetry
    "customer", "customers", "support", "service", "services", "agent", "agents", "rep", 
    "representative", "ticket", "tickets", "case", "cases", "inquiry", "inquiries", 
    "complaint", "complaints", "issue", "issues", "problem", "problems", "reopen", "reopened", 
    "reopening", "reopens", "resolution", "resolved", "resolving", "resolve", "fcr", "csat", 
    "sla", "slas", "metrics", "analytics", "cluster", "clusters", "topic", "topics", 
    "volume", "trend", "trends", "sentiment", "escalation", "escalate", "escalated", 
    "priority", "policy", "policies", "queue", "queues", "velocity", "drift", "baseline",
    "response", "time", "times", "minute", "minutes", "hour", "hours", "day", "days", 
    "average", "mean", "median", "rate", "percentage", "share", "total", "count", "score",

    # Temporal & Adverbs
    "recent", "recently", "current", "currently", "latest", "past", "previous", "earlier", 
    "today", "yesterday", "weekly", "monthly", "yearly", "annual", "daily", "fast", "faster",

    # Geography & Regions
    "north", "south", "east", "west", "america", "american", "europe", "european", "asia", 
    "asian", "latam", "apac", "emea", "global", "regional", "country", "city",

    # Common English Adjectives & Verbs
    "good", "better", "best", "great", "fine", "ok", "okay", "high", "higher", "highest", 
    "low", "lower", "lowest", "many", "much", "more", "most", "less", "least", "first", 
    "second", "last", "new", "old", "same", "different", "able", "available", "unable",
    "top", "bottom", "critical", "urgent", "severe", "major", "minor", "key", "main", "primary",
    "list", "rank", "ranking", "summary", "summarize", "analyze", "analysis", "issues", "issue"
}

# General English words to prevent valid non-support words from being modified
_GENERAL_ENGLISH_WORDS = {
    "cake", "bake", "baking", "baker", "chocolate", "recipe", "cook", "cooking", "food", 
    "quantum", "physics", "black", "hole", "holes", "spaceship", "space", "astronomy", 
    "football", "soccer", "cricket", "basketball", "baseball", "tennis", "game", "match", 
    "championship", "tournament", "player", "movie", "film", "cinema", "song", "music", 
    "lyrics", "artist", "singer", "actor", "actress", "joke", "funny", "story", "book", 
    "weather", "rain", "sunny", "snow", "temperature", "forecast", "capital", "country", 
    "president", "minister", "history", "science", "biology", "chemistry", "math", "banana", 
    "apple", "orange", "fruit", "water", "coffee", "tea", "hotel", "flight", "car", "drive",
    "yesterday", "tomorrow", "tonight", "morning", "afternoon", "evening", "night", "week", 
    "month", "year", "weekend", "holiday", "vacation", "school", "college", "university",
    "win", "won", "winning", "winner", "score", "scored", "scores", "champion", "play", "played"
}

# Combine all known valid words
_ALL_VALID_WORDS = _SUPPORT_VOCABULARY | _GENERAL_ENGLISH_WORDS

# Domain acronyms that should always be preserved in uppercase or original casing
_ACRONYMS = {"sla", "fcr", "csat", "kpi", "kpis", "api", "apis", "ui", "ux", "2fa", "mfa", "sim", "wifi", "os", "ios", "p0", "p1", "p2", "p3", "voila", "voc"}


_COMMON_ABBREVIATIONS = {
    "avrg": "average",
    "avg": "average",
    "msgs": "messages",
    "msg": "message",
    "mins": "minutes",
    "min": "minute",
    "hrs": "hours",
    "hr": "hour",
    "sec": "seconds",
    "secs": "seconds",
    "ph": "phone",
    "phn": "phone",
    "updt": "update",
    "cust": "customer",
    "supp": "support",
    "serv": "service",
    "pwd": "password",
    "passwd": "password",
    "cant": "cannot",
    "dont": "do not",
    "wont": "will not",
    "isnt": "is not",
    "didnt": "did not",
    "hasnt": "has not",
    "havent": "have not"
}


_DOMAIN_SYNONYM_MAP = {
    "handset": "phone",
    "handsets": "phones",
    "cellphone": "phone",
    "cellphones": "phones",
    "smartphone": "phone",
    "smartphones": "phones",
    "hanging": "freezing",
    "hangs": "freezes",
    "hung": "frozen",
    "firmware": "software update",
    "wlan": "wifi",
    "hotspot": "wifi",
    "sluggish": "slow",
    "depleted": "drained",
    "bricked": "broken",
    "overbilled": "overcharged",
    "tariff": "plan",
    "tariffs": "plans",
}


def _levenshtein_distance(s1: str, s2: str) -> int:
    """Computes the Levenshtein edit distance between two strings."""
    if len(s1) < len(s2):
        return _levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def _collapse_repeated_chars(word: str) -> str:
    """Collapses 3+ consecutive identical characters to at most 2 (e.g. 'freeeezing' -> 'freezing')."""
    return re.sub(r'(.)\1{2,}', r'\1\1', word)


def correct_token(token: str) -> str:
    """Corrects a single token against domain and general vocabulary using Levenshtein distance and synonym mapping."""
    raw_lower = token.lower().strip(".,!?;:\"'()[]{}")
    if not raw_lower:
        return token

    # 1. Check direct abbreviations & contractions
    if raw_lower in _COMMON_ABBREVIATIONS:
        return _COMMON_ABBREVIATIONS[raw_lower]

    # 2. Check canonical domain synonym mapping (e.g. handset -> phone, hanging -> freezing)
    if raw_lower in _DOMAIN_SYNONYM_MAP:
        return _DOMAIN_SYNONYM_MAP[raw_lower]

    # 3. Preserve acronyms
    if raw_lower in _ACRONYMS:
        return raw_lower.upper() if raw_lower in {"sla", "fcr", "csat", "kpi", "kpis", "api", "2fa", "p0", "p1", "voc"} else raw_lower

    # 4. If token is already a valid word in either support or general English, preserve it
    if raw_lower in _ALL_VALID_WORDS:
        return raw_lower

    # 4. Collapse repeated characters (e.g., 'sloooow' -> 'slow', 'phooone' -> 'phone')
    collapsed = _collapse_repeated_chars(raw_lower)
    if collapsed in _ALL_VALID_WORDS:
        return collapsed
    collapsed_single = re.sub(r'(.)\1+', r'\1', raw_lower)
    if collapsed_single in _ALL_VALID_WORDS:
        return collapsed_single

    # 5. If token is short (<= 2 chars) or contains numbers, avoid aggressive autocorrect
    if len(raw_lower) <= 2 or re.search(r'\d', raw_lower):
        return raw_lower

    # 6. Search for closest candidate in support vocabulary within edit distance 2
    best_candidate = raw_lower
    min_dist = 3 # Only accept edit distance 1 or 2
    best_score = float('inf')

    # Filter candidates by length difference to optimize search
    candidates = [
        w for w in _SUPPORT_VOCABULARY 
        if abs(len(w) - len(raw_lower)) <= 2 and (w[0] == raw_lower[0] or len(raw_lower) >= 4)
    ]

    for cand in candidates:
        dist = _levenshtein_distance(raw_lower, cand)
        if dist <= 2:
            # Score candidate: lower distance, same start char, same end char
            same_start = (cand[0] == raw_lower[0])
            same_end = (cand[-1] == raw_lower[-1])
            len_diff = abs(len(cand) - len(raw_lower))
            
            score = (dist * 10) - (3 if same_start else 0) - (2 if same_end else 0) + len_diff
            if score < best_score:
                best_score = score
                best_candidate = cand
                min_dist = dist

    # If an edit distance 1 or 2 match was found, return candidate
    if min_dist <= 2:
        return best_candidate

    return raw_lower


# ==============================================================================
# EMOJI & SOCIAL MEDIA TEXT NORMALIZER (Demojize + Sentiment Preservation)
# ==============================================================================

EMOJI_SEMANTIC_MAP = {
    "🔋": " battery ",
    "💀": " dead ",
    "🔥": " overheating ",
    "😡": " angry frustrated ",
    "🤬": " angry outraged ",
    "📶": " wifi signal ",
    "📱": " phone device ",
    "💻": " laptop computer ",
    "💳": " payment card billing ",
    "💰": " money billing ",
    "💸": " money refund ",
    "📦": " package order delivery ",
    "🚚": " shipping delivery transit ",
    "✈️": " flight baggage travel ",
    "⏳": " slow delayed waiting ",
    "⌛": " delayed response time ",
    "⏱️": " response time sla ",
    "🔒": " password account locked ",
    "🔑": " auth login key ",
    "❌": " failed error not working ",
    "🚫": " blocked forbidden error ",
    "😭": " crying upset complaint ",
    "😢": " sad unhappy complaint ",
    "👍": " good satisfied resolved ",
    "✨": " great awesome ",
    "😊": " happy satisfied ",
    "💔": " broken heartbroken ",
    "⚠️": " warning issue alert ",
    "🚨": " critical urgent emergency "
}


def demojize_and_clean_social_text(text: str) -> str:
    """Converts emojis to descriptive words and cleans social handles, hashtags, and URLs."""
    import unicodedata
    if not text:
        return ""

    # 1. Map known high-frequency support emojis
    for emo, rep in EMOJI_SEMANTIC_MAP.items():
        if emo in text:
            text = text.replace(emo, rep)

    # 2. Translate remaining Unicode emojis using unicodedata.name
    clean_chars = []
    for ch in text:
        if ord(ch) > 0x1F000:
            try:
                name = unicodedata.name(ch).lower().replace("_", " ")
                clean_chars.append(f" {name} ")
            except ValueError:
                clean_chars.append(" ")
        else:
            clean_chars.append(ch)
    text = "".join(clean_chars)

    # 3. Clean URLs, handles, and clean hashtags
    text = re.sub(r'https?://\S+|www\.\S+', ' ', text)
    text = re.sub(r'@\w+', ' ', text)
    text = re.sub(r'#(\w+)', r' \1 ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def normalize_and_correct_query(query: str) -> Dict[str, any]:
    """Preprocesses, normalizes, demojizes, and spell-corrects a user query before embedding generation.
    
    Returns:
        {
            "original_query": str,
            "normalized_query": str,
            "corrected_words": list[tuple[str, str]],
            "was_corrected": bool
        }
    """
    if not query or not query.strip():
        return {
            "original_query": query,
            "normalized_query": query,
            "corrected_words": [],
            "was_corrected": False
        }

    raw_text = demojize_and_clean_social_text(query.strip())
    
    # Extract tokens while keeping punctuation structure
    tokens = raw_text.split()
    corrected_tokens = []
    corrections = []

    for token in tokens:
        # Separate leading/trailing punctuation
        m = re.match(r'^([^\w]*)([\w\-\'\.]+?)([^\w]*)$', token)
        if m:
            prefix, core, suffix = m.groups()
            corrected_core = correct_token(core)
            if corrected_core.lower() != core.lower():
                corrections.append((core, corrected_core))
            corrected_tokens.append(f"{prefix}{corrected_core}{suffix}")
        else:
            corrected_core = correct_token(token)
            if corrected_core.lower() != token.lower():
                corrections.append((token, corrected_core))
            corrected_tokens.append(corrected_core)

    normalized = " ".join(corrected_tokens)

    return {
        "original_query": raw_text,
        "normalized_query": normalized,
        "corrected_words": corrections,
        "was_corrected": len(corrections) > 0
    }
