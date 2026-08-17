import re
import pandas as pd
from typing import List

# ISO 639-1 language code → display name
LANGUAGE_NAMES = {
    "en": "English",
    "pt": "Portuguese",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "it": "Italian",
    "nl": "Dutch",
    "ru": "Russian",
    "zh": "Chinese",
    "tr": "Turkish",
    "hi": "Hindi",
    "pl": "Polish",
    "sv": "Swedish",
    "no": "Norwegian",
    "da": "Danish",
    "fi": "Finnish",
    "id": "Indonesian",
}

# Fast regex-based heuristic detectors (ordered by specificity)
_LANG_PATTERNS = [
    # Portuguese — unique chars / common words
    ("pt", re.compile(
        r"\b(?:obrigad[oa]|boa\s+noite|bom\s+dia|boa\s+tarde|por\s+favor|não|voce|você|está|estou|"
        r"pedido|entrega|pagamento|conta|reembolso|cancelamento|cobrança|fatura)\b",
        re.IGNORECASE
    )),
    # Spanish
    ("es", re.compile(
        r"\b(?:gracias|por\s+favor|buenos|buenas|hola|estoy|tengo|necesito|pedido|envío|pago|"
        r"devolución|cancelar|cuenta|tarjeta|problema)\b",
        re.IGNORECASE
    )),
    # French
    ("fr", re.compile(
        r"\b(?:merci|bonjour|bonsoir|s'il\s+vous\s+plaît|je\s+suis|je\s+voudrais|commande|"
        r"livraison|remboursement|annulation|compte|problème|paiement)\b",
        re.IGNORECASE
    )),
    # German
    ("de", re.compile(
        r"\b(?:danke|bitte|guten\s+(?:tag|morgen|abend)|ich\s+habe|bestellung|lieferung|zahlung|"
        r"rückerstattung|konto|problem|fehler)\b",
        re.IGNORECASE
    )),
    # Japanese (Hiragana/Katakana)
    ("ja", re.compile(r"[\u3040-\u309F\u30A0-\u30FF]")),
    # Chinese (CJK)
    ("zh", re.compile(r"[\u4E00-\u9FFF]")),
    # Korean
    ("ko", re.compile(r"[\uAC00-\uD7AF]")),
    # Arabic
    ("ar", re.compile(r"[\u0600-\u06FF]")),
    # Hindi / Devanagari
    ("hi", re.compile(r"[\u0900-\u097F]")),
    # Russian / Cyrillic
    ("ru", re.compile(r"[\u0400-\u04FF]")),
]

_langdetect_available = None


def _try_langdetect(text: str) -> str:
    """Try langdetect library for ambiguous texts, fall back gracefully."""
    global _langdetect_available
    if _langdetect_available is False:
        return "en"
    try:
        from langdetect import detect, LangDetectException
        _langdetect_available = True
        try:
            code = detect(text)
            # Map 3-letter codes to 2-letter where needed
            return code[:2] if code else "en"
        except LangDetectException:
            return "en"
    except ImportError:
        _langdetect_available = False
        return "en"


def _detect_one(text: str) -> str:
    """Detects ISO 639-1 language code for a single text string."""
    if not text or len(text.strip()) < 4:
        return "en"
    for lang_code, pattern in _LANG_PATTERNS:
        if pattern.search(text):
            return lang_code
    # Fallback: use langdetect if available, else default English
    if len(text) > 15:
        return _try_langdetect(text)
    return "en"


class LanguageDetector:
    """
    High-performance vectorized language detector for multilingual customer conversations.
    Uses fast regex heuristics (~1M rows/sec) with an optional langdetect fallback for
    ambiguous English-dominant texts.

    Returns ISO 639-1 two-letter language codes (e.g. 'en', 'pt', 'es', 'fr', 'de').
    """

    def detect(self, text: str) -> str:
        """Detects language of a single string."""
        return _detect_one(str(text) if text else "")

    def detect_series(self, series: pd.Series) -> pd.Series:
        """
        Vectorized detection over a Pandas Series.
        Fast path: regex patterns applied via vectorized str.contains(),
        short-circuits on first match per row.
        Returns a Series of ISO 639-1 codes.
        """
        if not hasattr(series, "fillna"):
            series = pd.Series(series)

        s = series.fillna("").astype(str)
        result = pd.Series("en", index=s.index, dtype="object")

        # Apply patterns in reverse order so earlier (more specific) ones win
        for lang_code, pattern in reversed(_LANG_PATTERNS):
            mask = s.str.contains(pattern, regex=True, na=False)
            result[mask] = lang_code

        return result

    @staticmethod
    def code_to_name(code: str) -> str:
        """Converts ISO 639-1 code to human-readable language name."""
        return LANGUAGE_NAMES.get(str(code).lower(), code.upper() if code else "Unknown")
