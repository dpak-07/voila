import difflib
import re
from typing import Any, Dict, List, Set, Tuple


def _clean_text_for_comparison(text: str) -> str:
    """Normalizes contractions, punctuation, and whitespace for robust near-duplicate detection."""
    cleaned = text.lower()
    cleaned = re.sub(r"can\'?t", "cannot", cleaned)
    cleaned = re.sub(r"can\s+not", "cannot", cleaned)
    cleaned = re.sub(r"won\'?t", "will not", cleaned)
    cleaned = re.sub(r"don\'?t", "do not", cleaned)
    cleaned = re.sub(r"isn\'?t", "is not", cleaned)
    cleaned = re.sub(r"i\'?m", "i am", cleaned)
    cleaned = re.sub(r"[^\w\s]", "", cleaned)
    return " ".join(cleaned.split())


def compute_string_similarity(text1: str, text2: str) -> float:
    """Computes normalized character sequence similarity ratio between two texts."""
    c1 = _clean_text_for_comparison(text1)
    c2 = _clean_text_for_comparison(text2)
    if not c1 or not c2:
        return 0.0
    if c1 == c2:
        return 1.0
    return difflib.SequenceMatcher(None, c1, c2).ratio()


def deduplicate_and_diversify(
    documents: List[Dict[str, Any]],
    similarity_threshold: float = 0.65,
    max_results: int = 5
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Problem 10: Deduplication and Diversity Filtering Layer.
    
    Compares retrieved documents sequentially and filters out near-duplicate
    conversations to ensure maximum informational diversity for the LLM.
    """
    if not documents:
        return [], {"original_count": 0, "deduped_count": 0, "removed_count": 0}

    diverse_docs: List[Dict[str, Any]] = []
    removed_duplicates: List[Dict[str, Any]] = []

    for candidate in documents:
        cand_text = candidate.get("text", "").strip()
        if not cand_text:
            continue

        # Compare candidate against already selected diverse documents
        is_duplicate = False
        for selected in diverse_docs:
            sel_text = selected.get("text", "").strip()
            sim = compute_string_similarity(cand_text, sel_text)
            
            # If similarity exceeds threshold, suppress near-duplicate
            if sim >= similarity_threshold:
                is_duplicate = True
                candidate["duplicate_of"] = selected.get("id") or sel_text[:50]
                candidate["duplicate_similarity"] = sim
                removed_duplicates.append(candidate)
                break

        if not is_duplicate:
            diverse_docs.append(candidate)

        if len(diverse_docs) >= max_results:
            break

    metrics = {
        "original_count": len(documents),
        "deduped_count": len(diverse_docs),
        "removed_count": len(removed_duplicates),
        "diversity_ratio": round(len(diverse_docs) / max(1, len(documents)), 3)
    }

    return diverse_docs, metrics
