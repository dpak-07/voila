import re
from typing import Any, Dict, List, Optional


SYMPTOM_INDICATORS = {
    "crash", "crashed", "crashing", "crashes",
    "freeze", "freezing", "frozen", "freezes",
    "stuck", "hanging", "slow", "lag", "lagging", "latency",
    "delay", "delayed", "delays", "dropped",
    "error", "errors", "broken", "failed", "failing", "failure",
    "bug", "bugs", "glitch", "glitches", "malfunction",
    "drain", "draining", "heating", "overheating",
    "cannot", "can't", "unable", "unusable", "unresponsive",
    "refund", "refunded", "charge", "charged", "overcharge",
    "lost", "missing", "damaged", "wrong", "late"
}

CANNED_AGENT_PATTERNS = [
    r"(?i)please\s+(?:dm|direct message|send us a dm|email)\s+us",
    r"(?i)we\'?d\s+like\s+to\s+help.*please\s+reach\s+out",
    r"(?i)thanks\s+for\s+reaching\s+out.*dm\s+us",
    r"(?i)apologies\s+for\s+the\s+inconvenience.*please\s+contact",
    r"(?i)our\s+team\s+is\s+looking\s+into\s+this",
    r"(?i)hi\s+there,\s+please\s+send"
]


def score_specificity(text: str) -> float:
    """Evaluates the informational specificity and diagnostic richness of a conversation snippet."""
    if not text or not text.strip():
        return 0.0

    raw_words = text.strip().split()
    word_count = len(raw_words)

    # 1. Word count length prior (penalize 1-3 word generic text like 'issue', 'help')
    if word_count <= 2:
        return 0.10
    elif word_count <= 5:
        return 0.30
    elif word_count <= 10:
        return 0.60
    elif word_count <= 35:
        len_score = 0.90
    else:
        len_score = 1.00

    # 2. Presence of concrete symptom indicators
    tokens = set(re.findall(r'\b[a-zA-Z]+\b', text.lower()))
    symptom_count = len(tokens & SYMPTOM_INDICATORS)
    symptom_score = min(1.0, symptom_count * 0.35)

    return round(0.50 * len_score + 0.50 * symptom_score, 4)


def score_intent_match(query: str, text: str) -> float:
    """Measures lexical and semantic keyword overlap with user query intent."""
    q_tokens = set(re.findall(r'\b[a-zA-Z0-9_\-]+\b', query.lower())) - {"the", "a", "an", "is", "are", "in", "on", "of", "to", "for", "with", "my", "our", "why", "what", "how"}
    if not q_tokens:
        return 0.50

    d_tokens = set(re.findall(r'\b[a-zA-Z0-9_\-]+\b', text.lower()))
    overlap = len(q_tokens & d_tokens)
    return round(min(1.0, overlap / len(q_tokens)), 4)


def score_metadata_signal(doc: Dict[str, Any]) -> float:
    """Evaluates metadata quality, giving bonus to real customer complaints and penalizing agent canned replies."""
    text = doc.get("text", "")
    inbound = doc.get("inbound")
    author_id = str(doc.get("author_id", "")).lower()

    # 1. Check for canned agent response patterns
    for pattern in CANNED_AGENT_PATTERNS:
        if re.search(pattern, text):
            return 0.15 # Strong penalty for generic agent redirection messages

    # 2. Check author role
    if inbound is False or "support" in author_id or "help" in author_id or "care" in author_id:
        return 0.40 # Outbound or agent response

    if inbound is True or (inbound is None and "@" in text):
        return 0.95 # Verified customer inbound complaint

    return 0.70


def rerank_documents(
    query: str,
    documents: List[Dict[str, Any]],
    top_k: int = 5,
    excluded_terms: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """Problem 11: Multi-Factor Retrieval Reranking.
    
    Reranks candidate documents combining:
    - Semantic similarity score (35%)
    - Content specificity & diagnostic richness (25%)
    - Query intent overlap (20%)
    - Customer metadata signal (20%)
    - Negation penalty (-75% if document matches an explicitly excluded issue)
    """
    if not documents:
        return []

    reranked = []
    excl_set = set(t.lower() for t in (excluded_terms or []))

    for doc in documents:
        raw_score = float(doc.get("score") or doc.get("composite_score") or doc.get("rrf_score") or 0.50)
        text = doc.get("text", "")
        text_lower = text.lower()

        s_semantic = raw_score
        s_spec = score_specificity(text)
        s_intent = score_intent_match(query, text)
        s_meta = score_metadata_signal(doc)

        final_score = (
            (0.35 * s_semantic) +
            (0.25 * s_spec) +
            (0.20 * s_intent) +
            (0.20 * s_meta)
        )

        # Apply strong negation penalty if document contains explicitly negated concepts
        if excl_set and any(re.search(rf"\b{re.escape(term)}\b", text_lower) for term in excl_set):
            final_score = max(0.01, final_score - 0.75)

        doc_copy = dict(doc)
        doc_copy["rerank_score"] = round(final_score, 4)
        doc_copy["specificity_score"] = s_spec
        doc_copy["intent_score"] = s_intent
        doc_copy["metadata_score"] = s_meta
        reranked.append(doc_copy)

    # Sort descending by final rerank score
    reranked.sort(key=lambda d: d.get("rerank_score", 0.0), reverse=True)
    return reranked[:top_k]
