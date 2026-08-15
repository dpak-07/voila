from enum import Enum
from typing import Any, Dict


class DataConfidence(str, Enum):
    MEASURED = "measured"
    ESTIMATED_SAMPLED = "estimated_sampled"
    NO_DATA_AVAILABLE = "no_data_available"


def create_no_data_response(reason: str, filters: Dict[str, Any] = None) -> Dict[str, Any]:
    """Creates a standard honest payload indicating missing or uncomputable data."""
    return {
        "status": "no_data_available",
        "data_status": DataConfidence.NO_DATA_AVAILABLE.value,
        "reason": reason,
        "filters": filters or {},
    }
