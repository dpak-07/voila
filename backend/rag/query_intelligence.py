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
    """Pillar 4 & 14: Query specificity check to catch vague, one-word queries and bare greetings."""
    clean_text = query.strip()
    words = [w for w in clean_text.split() if w.strip()]
    q_lower = clean_text.lower().strip(".,!?")

    # 1. Pure Conversational Greetings & Help Requests (e.g. 'hi', 'hello', 'help')
    greetings = {"hi", "hello", "hey", "greetings", "help", "howdy", "sup"}
    if q_lower in greetings or clean_text.lower() in {"good morning", "good afternoon", "good evening", "need help"}:
        return {
            "is_specific": False,
            "status": "greeting",
            "message": "Hello! I am Voilà Copilot, your Voice-of-Customer Intelligence Assistant. How can I assist you with analyzing your customer support dataset today?",
            "suggested_prompts": [
                "What are the top complaint clusters?",
                "Why are delivery times delayed?",
                "What is our First-Contact Resolution (FCR) rate?"
            ]
        }

    # 2. Ultra-short single word queries (e.g. 'phone', 'app', 'delay')
    if len(words) == 1 and len(clean_text) < 15:
        term = q_lower
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

def _expand_morphological_variants(terms: List[str]) -> List[str]:
    """Expands root terms with common inflections so negative filters catch all forms."""
    expanded = set()
    for t in terms:
        t_clean = t.strip().lower()
        if not t_clean or len(t_clean) <= 2:
            continue
        expanded.add(t_clean)
        if t_clean in {"freeze", "freezing", "frozen", "freezes"}:
            expanded.update(["freeze", "freezing", "frozen", "freezes"])
        elif t_clean in {"crash", "crashing", "crashed", "crashes"}:
            expanded.update(["crash", "crashing", "crashed", "crashes"])
        elif t_clean in {"drain", "draining", "drains", "drained"}:
            expanded.update(["drain", "draining", "drains", "drained"])
        elif t_clean in {"login", "logging", "log"}:
            expanded.update(["login", "logging", "sign in", "signing in"])
        elif t_clean in {"lag", "lagging", "lags", "slow"}:
            expanded.update(["lag", "lagging", "lags", "slow", "slowly"])
        elif t_clean in {"drop", "dropped", "dropping", "drops"}:
            expanded.update(["drop", "dropped", "dropping", "drops"])
        elif t_clean in {"heat", "heating", "overheat", "overheating", "hot"}:
            expanded.update(["heat", "heating", "overheat", "overheating", "hot"])
        elif t_clean in {"disconnect", "disconnecting", "disconnected", "disconnects"}:
            expanded.update(["disconnect", "disconnecting", "disconnected", "disconnects"])
        elif t_clean in {"delay", "delayed", "delays", "delaying", "late"}:
            expanded.update(["delay", "delayed", "delays", "delaying", "late"])
        elif t_clean.endswith("ing") and len(t_clean) > 4:
            base = t_clean[:-3]
            expanded.add(base)
            expanded.add(base + "es")
            expanded.add(base + "ed")
    return sorted(list(expanded))


def extract_negation_and_focus(query: str) -> Dict[str, Any]:
    """Pillar 6: Extracts positive customer issue focus and excluded negative constraints.
    
    Examples:
        'My phone is not freezing, but the battery is draining very fast'
        -> focus: 'my phone battery is draining very fast'
        -> excluded: ['freezing', 'freeze', 'frozen', 'freezes']
        
        'Ignore freezing, show me battery drain issues'
        -> focus: 'battery drain issues'
        -> excluded: ['freezing', 'freeze', 'frozen', 'freezes']
    """
    q_lower = query.lower().strip()
    
    # 1. Directive exclusion: e.g. 'ignore X, show me Y' / 'exclude X, tell me about Y'
    dir_match = re.match(
        r'^(?:ignore|skip|exclude|excluding|aside from)\s+([^,;\n]+?)[,;\s]+(?:tell me about|show me|look at|focus on|what about|how about|why is|why are)?\s*(.+)$',
        q_lower
    )
    if dir_match:
        excluded_raw, focus_raw = dir_match.group(1).strip(), dir_match.group(2).strip()
        excluded_tokens = [t for t in re.findall(r'\b[a-zA-Z]{3,}\b', excluded_raw) if t not in {"the", "and", "for", "with", "have", "has", "been", "issues", "issue", "problem", "problems"}]
        expanded_excl = _expand_morphological_variants(excluded_tokens)
        return {
            "has_negation": True,
            "original_query": query,
            "focus_query": focus_raw,
            "excluded_terms": expanded_excl,
            "explanation": f"Focusing retrieval on '{focus_raw}' while filtering out '{excluded_raw}'"
        }

    # 2. Postfix negation: e.g. 'battery draining without phone freezing' / 'battery draining and not freezing'
    post_match = re.match(
        r'^(.+?)\s+(?:without|excluding|not including|except for|and not)\s+(.+)$',
        q_lower
    )
    if post_match:
        focus_candidate, excluded_raw = post_match.group(1).strip(), post_match.group(2).strip()
        # Ensure focus candidate itself doesn't contain leading negation
        if not re.search(r'\b(?:not|no|never)\b', focus_candidate):
            excluded_tokens = [t for t in re.findall(r'\b[a-zA-Z]{3,}\b', excluded_raw) if t not in {"the", "and", "for", "with", "have", "has", "been", "issues", "issue", "problem", "problems"}]
            expanded_excl = _expand_morphological_variants(excluded_tokens)
            return {
                "has_negation": True,
                "original_query": query,
                "focus_query": focus_candidate,
                "excluded_terms": expanded_excl,
                "explanation": f"Focusing retrieval on '{focus_candidate}' while excluding '{excluded_raw}'"
            }

    # 3. Contrastive negation: 'My phone is not freezing, but the battery is draining very fast'
    contrast_parts = re.split(r'[,;\s]+(?:but|however|instead|yet|though|except that|other than that|rather than)\s+', q_lower, maxsplit=1)
    if len(contrast_parts) == 2:
        part1, part2 = contrast_parts[0].strip(), contrast_parts[1].strip()
        neg_patterns = [
            r'\bnot\b', r'\bno\b', r'\bnever\b', r'\bwithout\b',
            r'\bisn\'t\b', r'\bis not\b', r'\baren\'t\b', r'\bare not\b',
            r'\bwon\'t\b', r'\bwill not\b', r'\bdoesn\'t\b', r'\bdoes not\b',
            r'\bdon\'t\b', r'\bdo not\b', r'\bdidn\'t\b', r'\bdid not\b',
            r'\bcannot\b', r'\bcan\'t\b'
        ]
        has_neg1 = any(re.search(p, part1) for p in neg_patterns)
        has_neg2 = any(re.search(p, part2) for p in neg_patterns)
        
        if has_neg1 and not has_neg2:
            # part1 is negated, part2 is positive focus
            subj_m = re.match(r'^(my\s+[\w]+|the\s+[\w]+|[\w]+)\s+(?:is|are|was|were|has|have|keeps|keep|starts|started)?\s*(?:not|never|without|no|isn\'t|is not)\s+(.+)$', part1)
            subject = subj_m.group(1) if subj_m else ''
            negated = subj_m.group(2) if subj_m else re.sub(r'\b(?:my|the|is|are|was|were|has|have|not|never|no|without|isn\'t|is not)\b', '', part1).strip()
            
            # Clean up focus clause
            clean_part2 = re.sub(r'^(?:the|my|a|an)\s+', '', part2).strip()
            
            # Combine subject with part2 if subject not already mentioned in part2
            if subject and not any(w in part2 for w in subject.split() if len(w) > 2):
                focus = f"{subject} {clean_part2}"
            else:
                focus = part2
            
            excluded_tokens = [t for t in re.findall(r'\b[a-zA-Z]{3,}\b', negated) if t not in {"the", "and", "for", "with", "have", "has", "been", "very", "much", "issues", "issue", "problem", "problems"}]
            expanded_excl = _expand_morphological_variants(excluded_tokens)
            
            return {
                "has_negation": True,
                "original_query": query,
                "focus_query": focus,
                "excluded_terms": expanded_excl,
                "explanation": f"Focusing retrieval on '{focus}' while filtering out '{negated}'"
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
# PILLAR 8: OUT-OF-DOMAIN INTENT CLASSIFICATION
# ==============================================================================

OUT_OF_DOMAIN_PATTERNS = [
    r'(?i)\b(?:capital\s+of|president\s+of|prime\s+minister|population\s+of|weather\s+in|weather\s+forecast)\b',
    r'(?i)\b(?:who\s+won\s+the|world\s+cup|super\s+bowl|nba\s+finals|uefa|champion\s+league)\b',
    r'(?i)\b(?:how\s+to\s+bake|recipe\s+for|cook\s+a|chocolate\s+cake|how\s+to\s+cook|baking\s+recipe)\b',
    r'(?i)\b(?:speed\s+of\s+light|quantum\s+physics|black\s+hole|astronomy|solar\s+system|distance\s+to\s+the\s+moon)\b',
    r'(?i)\b(?:who\s+wrote|who\s+directed|lyrics\s+of|actor\s+in|movie\s+plot|synopsis\s+of)\b',
    r'(?i)\b(?:tell\s+me\s+a\s+joke|write\s+a\s+poem|sing\s+a\s+song)\b',
    r'(?i)\b(?:solve\s+\d+|derivative\s+of|integral\s+of|square\s+root\s+of)\b',
]

SUPPORT_DOMAIN_INDICATORS = {
    # Devices & hardware
    "phone", "phones", "mobile", "cellphone", "handset", "smartphone", "iphone", "android", "device", 
    "devices", "tablet", "ipad", "laptop", "computer", "screen", "display", "battery", "charger", 
    "charging", "cable", "port", "sim", "card", "speaker", "camera", "mic", "microphone", "headphones",
    
    # Software & connectivity
    "app", "apps", "application", "software", "firmware", "update", "updates", "updated", "upgrade", 
    "version", "patch", "install", "download", "reboot", "restart", "reset", "wifi", "bluetooth", 
    "network", "signal", "internet", "connect", "connection", "disconnect", "offline", "online", 
    "data", "login", "logout", "password", "passcode", "auth", "account", "profile",
    
    # Symptoms & friction
    "freeze", "freezing", "frozen", "freezes", "crash", "crashing", "crashed", "crashes", "hanging", 
    "hangs", "stuck", "slow", "lag", "lagging", "latency", "delay", "delayed", "failing", "fail", 
    "error", "broken", "dropped", "heating", "overheating", "draining", "drain", "drains", "glitch", 
    "bug", "malfunction", "unresponsive", "refund", "charge", "charged", "order", "delivery", "shipping",
    
    # Support & Analytics
    "support", "service", "agent", "ticket", "case", "inquiry", "inquiries", "complaint", "complaints", 
    "issue", "issues", "problem", "problems", "reopen", "resolution", "fcr", "csat", "sla", "slas", 
    "metric", "metrics", "kpi", "kpis", "cluster", "clusters", "topic", "topics", "sentiment", "escalation", 
    "priority", "p0", "p1", "policy", "queue", "response time"
}


def classify_domain_relevance(query: str) -> Dict[str, Any]:
    """Classifies whether a user query falls within the customer support and dataset analytics domain."""
    q_clean = query.strip().lower()
    tokens = set(re.findall(r'\b[a-zA-Z0-9_\-]+\b', q_clean))

    # 1. Match explicit out-of-domain patterns (trivia, world knowledge, baking recipes, entertainment)
    for pattern in OUT_OF_DOMAIN_PATTERNS:
        if re.search(pattern, q_clean):
            # If no strong support domain indicators are present, reject as out-of-domain
            if not any(token in SUPPORT_DOMAIN_INDICATORS for token in tokens):
                return {
                    "is_in_domain": False,
                    "status": "out_of_domain",
                    "message": "I specialize exclusively in analyzing customer support operations, SLA response velocity, topic clustering, and Voice-of-Customer telemetry. I can only help with customer support related queries."
                }

    # 2. Check for queries completely devoid of support concepts that match general trivia questions
    if q_clean.startswith(("what is the capital", "who is the president", "how many calories", "when was the war", "tell me about history")):
        return {
            "is_in_domain": False,
            "status": "out_of_domain",
            "message": "I specialize exclusively in analyzing customer support operations, SLA response velocity, topic clustering, and Voice-of-Customer telemetry. I can only help with customer support related queries."
        }

    return {
        "is_in_domain": True,
        "status": "in_domain",
        "message": ""
    }


# ==============================================================================
# UNIFIED 7-PILLAR QUERY INTELLIGENCE ENGINE
# ==============================================================================

class QueryIntelligenceEngine:
    """Unified 7-Pillar Query Intelligence, Normalization, and Retrieval Coordinator."""

    def preprocess_query(self, raw_query: str) -> Dict[str, Any]:
        """Runs Pillars 1, 3, 4, 5, 6, 8 before embedding generation."""
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

        # 2. Pillar 8: Out-of-Domain Classification (e.g. 'capital of France', baking recipes)
        domain_check = classify_domain_relevance(val["clean_query"])
        if not domain_check["is_in_domain"]:
            return {
                "status": domain_check["status"],
                "is_valid": False,
                "error_message": domain_check["message"],
                "suggested_prompts": [
                    "What are the top complaint clusters?",
                    "What is our average SLA response time?",
                    "Why are delivery times delayed?"
                ],
                "clean_query": val["clean_query"],
                "sub_queries": []
            }

        # 3. Pillar 1: Spell Correction, Synonym Mapping & Normalization
        norm = normalize_and_correct_query(val["clean_query"])
        normalized_text = norm["normalized_query"]

        # 4. Pillar 4: Query Specificity Check
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

        # 5. Pillar 6: Negation & Focus Extraction
        neg = extract_negation_and_focus(normalized_text)
        focus_query = neg["focus_query"]

        # 6. Pillar 5: Multi-Intent Decomposition
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
