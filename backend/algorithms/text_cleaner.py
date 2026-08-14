import re

class TextCleaner:
    """Generalized text cleaning utility for normalizing customer messages."""
    
    def __init__(self, strip_urls: bool = True, strip_mentions: bool = True, lowercase: bool = True):
        self.strip_urls = strip_urls
        self.strip_mentions = strip_mentions
        self.lowercase = lowercase

    def clean(self, text: str) -> str:
        if not isinstance(text, str):
            return ""
            
        # Optional lowercase
        if self.lowercase:
            text = text.lower()
            
        # Strip URLs
        if self.strip_urls:
            text = re.sub(r"http\S+|www\S+", "", text)
            
        # Strip social media @mentions/handles
        if self.strip_mentions:
            text = re.sub(r"@\w+", "", text)
            
        # Keep alphanumeric, basic punctuation, and whitespace
        text = re.sub(r"[^a-zA-Z0-9\s\.,!?#\-]", "", text)
        
        # Normalize whitespace
        text = re.sub(r"\s+", " ", text)
        
        return text.strip()

    def clean_series(self, series):
        """Cleans a Pandas Series or list of text strings."""
        if hasattr(series, "fillna"):
            return series.fillna("").astype(str).apply(self.clean)
        return [self.clean(str(x)) for x in series]
