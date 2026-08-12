import json
from pathlib import Path
from typing import Any, Dict, List


def load_json_data(file_path: str) -> List[Dict[str, Any]]:
    path = Path(file_path)
    if not path.exists():
        return []
    with path.open('r', encoding='utf-8') as handle:
        return json.load(handle).get('conversations', [])


def save_json_data(file_path: str, data: Any) -> None:
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as handle:
        json.dump(data, handle, indent=2)


def process_database_file(file_path: str) -> List[Dict[str, Any]]:
    """Load and normalize the database JSON content."""
    conversations = load_json_data(file_path)
    for record in conversations:
        record['text'] = record.get('text', '').strip()
    return conversations
