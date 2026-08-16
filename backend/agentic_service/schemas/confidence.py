from enum import Enum
from typing import Any, Dict


class DataConfidence(str, Enum):
    MEASURED = "measured"
    PROXY = "proxy"
    ESTIMATED_SAMPLED = "estimated_sampled"
    ESTIMATED = "estimated"
    NO_DATA_AVAILABLE = "no_data_available"


PROXY_METHODOLOGY: Dict[str, Dict[str, Any]] = {
    "avg_response_time_minutes": {
        "type": "measured",
        "label": "Average Response Time",
        "description": "Calculated directly from exact timestamps: (first agent response timestamp - customer inquiry timestamp).",
        "formula": "mean(created_at_response - created_at_inbound)"
    },
    "resolution_rate": {
        "type": "proxy",
        "label": "Resolution Rate (Proxy)",
        "description": "Derived from thread termination state: True when the last message in a multi-turn conversation thread is from a support agent.",
        "formula": "(conversations_ending_with_agent / total_conversations) * 100"
    },
    "escalation_rate": {
        "type": "proxy",
        "label": "Escalation Rate (Proxy)",
        "description": "Derived from conversational priority/sentiment: True when an inbound customer message has negative sentiment, urgent intent, or multiple agent transfers.",
        "formula": "(high_urgency_or_negative_inbound / total_inbound_conversations) * 100"
    },
    "reopen_rate": {
        "type": "proxy",
        "label": "Reopen Rate (Proxy)",
        "description": "Derived from sequential thread turn state: True when a customer responds after an agent has already provided a resolution message.",
        "formula": "(conversations_with_customer_reply_post_agent / total_closed_conversations) * 100"
    },
    "csat_proxy": {
        "type": "proxy",
        "label": "CSAT / Satisfaction Index (Proxy)",
        "description": "Derived from customer sentiment distribution: Polarity-weighted customer satisfaction index across all interactions.",
        "formula": "((positive_volume + 0.5 * neutral_volume) / total_volume) * 100"
    }
}


def create_no_data_response(reason: str, filters: Dict[str, Any] = None) -> Dict[str, Any]:
    """Creates a standard honest payload indicating missing or uncomputable data."""
    return {
        "status": "no_data_available",
        "data_status": DataConfidence.NO_DATA_AVAILABLE.value,
        "reason": reason,
        "filters": filters or {},
    }

