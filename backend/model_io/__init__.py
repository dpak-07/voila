import json
import pickle
from pathlib import Path
from typing import Any


def save_model(model: Any, path: str) -> None:
    file_path = Path(path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with file_path.open('wb') as handle:
        pickle.dump(model, handle)


def load_model(path: str) -> Any:
    file_path = Path(path)
    if not file_path.exists():
        return None
    with file_path.open('rb') as handle:
        return pickle.load(handle)


def save_metadata(metadata: dict, path: str) -> None:
    file_path = Path(path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with file_path.open('w', encoding='utf-8') as handle:
        json.dump(metadata, handle, indent=2)


def predict(input_data: dict) -> dict:
    return {
        'input': input_data,
        'prediction': 'placeholder',
        'confidence': 0.0,
    }
