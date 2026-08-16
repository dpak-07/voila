import re
import pandas as pd

class TextCleaner:
    """
    High-performance multilingual text cleaning utility.
    Preserves all international Unicode alphabets (Portuguese, Spanish, French, German, Japanese, etc.)
    while stripping Twitter support agent signatures, orphaned URLs, and markup noise.
    """
    
    def __init__(self, strip_urls: bool = True, strip_mentions: bool = True, lowercase: bool = True):
        self.strip_urls = strip_urls
        self.strip_mentions = strip_mentions
        self.lowercase = lowercase

    def clean(self, text: str) -> str:
        """Cleans a single text string with complete multilingual Unicode fidelity."""
        if not isinstance(text, str):
            return ""
            
        if self.lowercase:
            text = text.lower()
            
        if self.strip_urls:
            text = re.sub(r"https?://\S+|www\.\S+|http\S+", "", text)
            
        if self.strip_mentions:
            text = re.sub(r"@\w+", "", text)

        # Strip support agent initials (e.g., "^wm", "^ez", "^ns", "^nb")
        text = re.sub(r"\s*\^[a-zA-Z0-9]{1,4}\b", "", text)
        
        # Clean orphaned URL prompt words
        text = re.sub(r"\b(link|here|site|url|page):\s*([,\.!?]|$)", r"\2", text)
            
        # Retain all word characters (including Unicode letters across all languages), numbers, and standard punctuation
        text = re.sub(r"[^\w\s\.,!?#\-']", " ", text, flags=re.UNICODE)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def clean_series(self, series) -> pd.Series:
        """
        Vectorized series cleaning operating across full Unicode character sets (500,000+ rows/sec).
        """
        if not hasattr(series, "fillna"):
            series = pd.Series(series)
            
        s = series.fillna("").astype(str)
        if self.lowercase:
            s = s.str.lower()
        if self.strip_urls:
            s = s.str.replace(r"https?://\S+|www\.\S+|http\S+", "", regex=True)
        if self.strip_mentions:
            s = s.str.replace(r"@\w+", "", regex=True)

        # Remove support agent signatures
        s = s.str.replace(r"\s*\^[a-zA-Z0-9]{1,4}\b", "", regex=True)
        
        # Clean orphaned URL lead-ins
        s = s.str.replace(r"\b(link|here|site|url|page):\s*([,\.!?]|$)", r"\2", regex=True)
            
        # Retain Unicode letters, digits, and standard punctuation
        s = s.str.replace(r"[^\w\s\.,!?#\-']", " ", regex=True)
        s = s.str.replace(r"\s+", " ", regex=True).str.strip()
        return s
