import math
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from backend.rag.query_preprocessor import (
    _SUPPORT_VOCABULARY,
    _GENERAL_ENGLISH_WORDS,
    _ALL_VALID_WORDS,
    _ACRONYMS,
    _COMMON_ABBREVIATIONS,
    correct_token,
    normalize_and_correct_query
)

# ==============================================================================
# PILLAR 3: GIBBERISH & INPUT VALIDATION BEFORE EMBEDDING
# ==============================================================================

def _calculate_char_entropy(text: str) -> float:
    """Calculates Shannon entropy of characters in a string."""
    if not text:
        return 0.0
    text_clean = text.lower().replace(" ", "")
    if not text_clean:
        return 0.0
    freq = {}
    for c in text_clean:
        freq[c] = freq.get(c, 0) + 1
    entropy = 0.0
    length = len(text_clean)
    for count in freq.values():
        p = count / length
        entropy -= p * math.log2(p)
    return entropy


def detect_gibberish_and_validate(query: str) -> Dict[str, Any]:
    """Pillar 3: Input validation before embedding to catch gibberish, empty strings, and random keystrokes."""
    if not query or not query.strip():
        return {
            "is_valid": False,
            "status": "empty",
            "message": "Please enter a customer query.",
            "clean_query": ""
        }

    raw = query.strip()
    words = [w for w in re.findall(r'[a-zA-Z0-9_\-\']+', raw) if w]

    # 1. Check for pure repeated punctuation / symbols (e.g. '????', '!!!!!@@@')
    alpha_count = sum(c.isalpha() for c in raw)
    if alpha_count == 0 and len(raw) > 0:
        return {
            "is_valid": False,
            "status": "gibberish",
            "message": "Your query appears to contain only symbols or numbers. Please enter a customer support question.",
            "clean_query": raw
        }

    # 2. Check for keyboard mashing patterns (e.g. 'asdfghjkl', 'qwerty', 'xyz123', 'zxcvbnm')
    mashing_patterns = [
        r'(?i)\b(asdf|ghjk|qwer|zxcv|hjkl|poiuy|lkjhg|mnbvc|12345|xyz123)\w*\b'
    ]
    for pattern in mashing_patterns:
        if re.search(pattern, raw) and len(words) <= 4:
            # If the majority of words are keyboard mash strings
            mash_words = [w for w in words if re.search(pattern, w)]
            if len(mash_words) >= max(1, len(words) // 2):
                return {
                    "is_valid": False,
                    "status": "gibberish",
                    "message": f"Your query appears to contain random keystrokes ('{raw}'). Please enter a valid customer support question.",
                    "clean_query": raw
                }

    # 3. Check for high consonant ratio in individual tokens (unpronounceable strings like 'bcdfghjk')
    vowels = set("aeiouyAEIOUY")
    for w in words:
        if len(w) >= 6 and w.isalpha():
            vowel_count = sum(1 for c in w if c in vowels)
            if vowel_count == 0 or (len(w) >= 8 and vowel_count / len(w) < 0.15):
                return {
                    "is_valid": False,
                    "status": "gibberish",
                    "message": f"The term '{w}' appears to be unpronounceable random text. Please verify your query.",
                    "clean_query": raw
                }

    return {
        "is_valid": True,
        "status": "valid",
        "message": "",
        "clean_query": raw
    }


# ==============================================================================
# PILLAR 4: GENERIC QUERY & SPECIFICITY CHECK
# ==============================================================================

def check_query_specificity(query: str) -> Dict[str, Any]:
    """Pillar 4: Query specificity check to catch vague, one-word queries lacking context."""
    clean_text = query.strip()
    words = [w for w in clean_text.split() if w.strip()]

    common_conversational = {"hi", "hello", "help", "thanks", "status", "summary", "kpi", "topics", "clusters", "reopen", "fcr", "ok", "okay", "bye", "who", "what"}
    
    if len(words) == 1 and len(clean_text) < 15 and clean_text.lower() not in common_conversational:
        term = clean_text.lower().strip(".,!?")
        return {
            "is_specific": False,
            "status": "too_generic",
            "message": f"Your query '{clean_text}' is too brief to identify a specific root cause. Could you provide more detail? (For example: 'Why are customers having issues with their {term}?').",
            "suggested_prompts": [
                f"Why are customers having issues with their {term}?",
                f"What are the top complaint clusters for {term}?",
                f"What is the average response time for {term} tickets?"
            ]
        }

    return {
        "is_specific": True,
        "status": "specific",
        "message": "",
        "suggested_prompts": []
    }


# ==============================================================================
# PILLAR 6: NEGATION & FOCUS EXTRACTION BEFORE EMBEDDING
# ==============================================================================

def extract_negation_and_focus(query: str) -> Dict[str, Any]:
    """Pillar 6: Extracts positive customer issue focus and excluded negative constraints.
    
    Example:
        'customers who are NOT having login issues but have delivery delays'
        -> focus: 'delivery delays'
        -> excluded: 'login issues'
    """
    q_lower = query.lower()
    
    # Check for negation patterns
    negation_patterns = [
        # "not X but Y" / "not having X but have Y"
        r"(?:not|no|without|excluding)\s+([\w\s]+?)\s+(?:but|however|instead|focus on|tell me about)\s+([\w\s]+)",
        # "ignore X, tell me about Y"
        r"(?:ignore|skip|exclude|aside from)\s+([\w\s]+?)[,;\s]+(?:tell me about|show me|look at|focus on|what about)\s+([\w\s]+)",
        # "X without Y"
        r"([\w\s]+?)\s+(?:without|excluding|not including|except for)\s+([\w\s]+)"
    ]

    for pattern in negation_patterns:
        match = re.search(pattern, q_lower)
        if match:
            g1, g2 = match.groups()
            # If pattern is 'not X but Y' -> excluded=g1, focus=g2
            if "not" in pattern or "ignore" in pattern:
                excluded = g1.strip()
                focus = g2.strip()
            else: # 'X without Y' -> focus=g1, excluded=g2
                focus = g1.strip()
                excluded = g2.strip()

            return {
                "has_negation": True,
                "original_query": query,
                "focus_query": focus,
                "excluded_terms": [t.strip() for t in excluded.split() if len(t.strip()) > 2],
                "explanation": f"Focusing retrieval on '{focus}' while filtering out '{excluded}'"
            }

    return {
        "has_negation": False,
        "original_query": query,
        "focus_query": query,
        "excluded_terms": [],
        "explanation": ""
    }


# ==============================================================================
# PILLAR 5: MULTI-INTENT QUERY DECOMPOSITION & RRF RERANKING
# ==============================================================================

def decompose_multi_intent(query: str) -> Dict[str, Any]:
    """Pillar 5: Decomposes compound queries with multiple distinct intents for parallel retrieval."""
    q_clean = query.strip()
    
    # Split on coordinating conjunctions with substantive clauses
    split_regex = r'\s+(?:and also|in addition to|as well as|also|plus|\band\b|;)\s+'
    
    parts = re.split(split_regex, q_clean, flags=re.IGNORECASE)
    sub_queries = [p.strip() for p in parts if len(p.strip().split()) >= 2]

    # Only treat as multi-intent if we have 2+ substantive clauses
    is_multi_intent = len(sub_queries) >= 2

    return {
        "is_multi_intent": is_multi_intent,
        "original_query": q_clean,
        "sub_queries": sub_queries if is_multi_intent else [q_clean]
    }


def reciprocal_rank_fusion(ranked_lists: List[List[Dict[str, Any]]], k: int = 60) -> List[Dict[str, Any]]:
    """Merges multiple retrieved result lists using Reciprocal Rank Fusion (RRF)."""
    scores: Dict[str, float] = {}
    doc_map: Dict[str, Dict[str, Any]] = {}

    for ranked_list in ranked_lists:
        for rank, doc in enumerate(ranked_list):
            doc_id = str(doc.get("id") or doc.get("text", "")[:80])
            if not doc_id:
                continue
            doc_map[doc_id] = doc
            scores[doc_id] = scores.get(doc_id, 0.0) + (1.0 / (k + rank + 1))

    # Sort documents by accumulated RRF score descending
    sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
    fused_results = []
    for doc_id in sorted_ids:
        doc_copy = dict(doc_map[doc_id])
        doc_copy["rrf_score"] = scores[doc_id]
        fused_results.append(doc_copy)

    return fused_results


# ==============================================================================
# PILLAR 7: MULTI-FACTOR COMPOSITE RELEVANCE SCORING
# ==============================================================================

def compute_composite_relevance(
    vector_similarity: float,
    query: str,
    doc_text: str,
    topic_keywords: Optional[List[str]] = None
) -> float:
    """Pillar 7: Multi-factor composite confidence scoring.
    
    Combines:
    1. Dense Vector Cosine Similarity (50% weight)
    2. Lexical / Keyword Token Overlap (30% weight)
    3. Topic Cluster Alignment (20% weight)
    """
    # 1. Vector Score
    s_vec = max(0.0, min(1.0, vector_similarity))

    # 2. Lexical Token Overlap (BM25-style Jaccard ratio)
    q_tokens = set(re.findall(r'\w+', query.lower())) - {"the", "a", "an", "is", "are", "in", "on", "of", "to", "for", "with", "my", "our", "why", "what", "how"}
    d_tokens = set(re.findall(r'\w+', doc_text.lower()))
    
    overlap_count = len(q_tokens & d_tokens)
    s_lex = min(1.0, overlap_count / max(1, len(q_tokens))) if q_tokens else 0.5

    # 3. Topic Cluster Alignment
    s_topic = 0.0
    if topic_keywords:
        topic_set = set(k.lower() for k in topic_keywords)
        topic_overlap = len(q_tokens & topic_set)
        s_topic = min(1.0, topic_overlap / max(1, len(topic_keywords)))
    else:
        s_topic = s_lex

    # Composite weighted score
    composite = (0.50 * s_vec) + (0.30 * s_lex) + (0.20 * s_topic)
    return round(composite, 4)


# ==============================================================================
# PILLAR 2: POST-RETRIEVAL RELEVANCE & DOMAIN VALIDATION
# ==============================================================================

def validate_domain_relevance_post_retrieval(
    retrieved_documents: List[Dict[str, Any]],
    query: str,
    min_composite_threshold: float = 0.38
) -> Dict[str, Any]:
    """Pillar 2: Post-retrieval domain relevance validation to verify evidence validity."""
    if not retrieved_documents:
        return {
            "is_domain_relevant": False,
            "reason": "No documents met the retrieval criteria.",
            "filtered_documents": [],
            "max_composite_score": 0.0
        }

    scored_docs = []
    max_score = 0.0

    for doc in retrieved_documents:
        text = doc.get("text", "")
        raw_score = doc.get("score", 0.0)
        composite = compute_composite_relevance(raw_score, query, text)
        doc["composite_score"] = composite
        max_score = max(max_score, composite)
        if composite >= min_composite_threshold:
            scored_docs.append(doc)

    is_relevant = len(scored_docs) > 0

    return {
        "is_domain_relevant": is_relevant,
        "reason": f"Max composite score {max_score:.4f} vs threshold {min_composite_threshold:.4f}",
        "filtered_documents": scored_docs,
        "max_composite_score": max_score
    }


# ==============================================================================
# UNIFIED 7-PILLAR QUERY INTELLIGENCE ENGINE
# ==============================================================================

class QueryIntelligenceEngine:
    """Unified 7-Pillar Query Intelligence, Normalization, and Retrieval Coordinator."""

    def preprocess_query(self, raw_query: str) -> Dict[str, Any]:
        """Runs Pillars 1, 3, 4, 5, 6 before embedding generation."""
        # 1. Pillar 3: Gibberish & Empty Validation
        val = detect_gibberish_and_validate(raw_query)
        if not val["is_valid"]:
            return {
                "status": val["status"],
                "is_valid": False,
                "error_message": val["message"],
                "clean_query": "",
                "sub_queries": []
            }

        # 2. Pillar 1: Spell Correction & Normalization
        norm = normalize_and_correct_query(val["clean_query"])
        normalized_text = norm["normalized_query"]

        # 3. Pillar 4: Query Specificity Check
        spec = check_query_specificity(normalized_text)
        if not spec["is_specific"]:
            return {
                "status": spec["status"],
                "is_valid": False,
                "error_message": spec["message"],
                "suggested_prompts": spec["suggested_prompts"],
                "clean_query": normalized_text,
                "sub_queries": []
            }

        # 4. Pillar 6: Negation & Focus Extraction
        neg = extract_negation_and_focus(normalized_text)
        focus_query = neg["focus_query"]

        # 5. Pillar 5: Multi-Intent Decomposition
        multi = decompose_multi_intent(focus_query)

        return {
            "status": "ready",
            "is_valid": True,
            "error_message": "",
            "original_query": raw_query,
            "normalized_query": normalized_text,
            "focus_query": focus_query,
            "corrected_words": norm["corrected_words"],
            "has_negation": neg["has_negation"],
            "excluded_terms": neg["excluded_terms"],
            "is_multi_intent": multi["is_multi_intent"],
            "sub_queries": multi["sub_queries"]
        }
