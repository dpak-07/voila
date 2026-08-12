import re
from typing import Dict, List


def clean_text(text: str) -> str:
    text = text or ''
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s\.,!?]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def clean_records(records: List[Dict[str, str]]) -> List[Dict[str, str]]:
    for record in records:
        if 'text' in record:
            record['text'] = clean_text(record['text'])
    return records
