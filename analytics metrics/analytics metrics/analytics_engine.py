"""
Production-ready Customer Support Analytics Engine.

Purpose
-------
Consumes the transformed analytics dataset produced by the upstream team
(conversation reconstruction, sentiment analysis, topic/issue extraction,
pain-point extraction and proxy labels) and produces one database-ready
analytics document.

Metrics
-------
1. KPI
2. Escalation Rate + Spike Detection
3. Average Resolution Time (proxy until explicit resolution duration exists)
4. Context
5. Sentiment Analysis
6. Resolution Rate
7. Customer Pain Points
8. New Issues
9. Recurring Issues After Solution
10. Emerging Issues

KPI requirements
----------------
- issue reduction / recurrence over time
- sentiment impact
- mean response time
- impact of AI-proposed solution

Important
---------
The engine does NOT redo upstream NLP/sentiment/topic processing.
It consumes those features and calculates deterministic analytics.

The current schema does not contain AI-solution outcome fields, so the
AI-solution KPI is returned as "not_available" instead of inventing a value.

The current schema also does not contain an explicit resolution duration.
Until a resolution_time_minutes (or equivalent timestamp pair) is supplied,
average resolution time is explicitly labelled as a PROXY based on the
conversation duration of conversations marked resolved_proxy=True.
"""

from __future__ import annotations

import argparse
import json
import logging
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd


# ============================================================================
# LOGGING
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

logger = logging.getLogger("analytics_engine")


# ============================================================================
# CONFIGURATION
# ============================================================================

@dataclass(frozen=True)
class AnalyticsConfig:
    top_n: int = 10

    # Escalation spike detection
    rolling_window_days: int = 7
    spike_z_threshold: float = 2.0
    min_conversations_for_spike: int = 20

    # Emerging issue detection
    # 0.20 = 20% growth
    issue_growth_threshold: float = 0.20

    # Minimum observations needed before interpreting a trend
    minimum_trend_periods: int = 2


# ============================================================================
# INPUT CONTRACT
# ============================================================================

REQUIRED_COLUMNS = {
    "tweet_id",
    "author_id",
    "inbound",
    "created_at",
    "text",
    "sentiment",
    "confidence",
    "priority",
    "sentiment_score",
    "conversation_id",
    "topic_id",
    "topic_keywords",
    "topic_probability",
    "issue_category",
    "issue_subcategory",
    "customer_pain_point",
    "issue_volume",
    "issue_growth_rate",
    "new_issue",
    "recurring_issue",
    "recurring_after_solution",
    "emerging_issue",
    "spike_detected",
    "spike_score",
    "response_exists",
    "response_time_minutes",
    "resolved_proxy",
    "escalation_proxy",
    "reopened_proxy",
    "category_sentiment_score",
}

# These are future-compatible fields. If present, AI-solution impact
# is calculated automatically.
OPTIONAL_AI_COLUMNS = {
    "ai_solution_proposed",
    "ai_solution_success",
    "pre_solution_sentiment",
    "post_solution_sentiment",
}


# ============================================================================
# GENERIC HELPERS
# ============================================================================

def is_missing(value: Any) -> bool:
    try:
        return bool(pd.isna(value))
    except (TypeError, ValueError):
        return False


def safe_bool(value: Any) -> bool:
    """Convert common boolean representations to bool."""

    if is_missing(value):
        return False

    if isinstance(value, bool):
        return value

    if isinstance(value, (int, float, np.integer, np.floating)):
        return bool(value != 0)

    normalized = str(value).strip().lower()

    return normalized in {
        "true",
        "1",
        "yes",
        "y",
        "t",
    }


def safe_numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def safe_mean(series: pd.Series) -> float:
    values = pd.to_numeric(series, errors="coerce").dropna()

    if values.empty:
        return 0.0

    return round(float(values.mean()), 2)


def safe_median(series: pd.Series) -> float:
    values = pd.to_numeric(series, errors="coerce").dropna()

    if values.empty:
        return 0.0

    return round(float(values.median()), 2)


def percentage(numerator: float, denominator: float) -> float:
    if denominator == 0 or pd.isna(denominator):
        return 0.0

    return round((float(numerator) / float(denominator)) * 100.0, 2)


def normalize_text(value: Any) -> str:
    if is_missing(value):
        return ""

    return str(value).strip()


def normalize_category(value: Any) -> str:
    text = normalize_text(value)

    if not text or text.lower() in {"nan", "none", "null"}:
        return "Unknown"

    return text


def normalize_sentiment(value: Any) -> str:
    text = normalize_text(value).lower()

    aliases = {
        "neg": "negative",
        "negative": "negative",
        "neu": "neutral",
        "neutral": "neutral",
        "pos": "positive",
        "positive": "positive",
    }

    return aliases.get(text, text if text else "unknown")


def top_counts(
    series: pd.Series,
    top_n: int = 10,
    name_key: str = "name",
) -> list[dict[str, Any]]:
    values = (
        series.map(normalize_category)
        .replace({"Unknown": np.nan})
        .dropna()
    )

    counts = values.value_counts().head(top_n)

    return [
        {
            name_key: str(name),
            "count": int(count),
        }
        for name, count in counts.items()
    ]


def json_safe(value: Any) -> Any:
    """
    Convert Python, NumPy and Pandas values into JSON-safe values.
    """

    if value is None:
        return None

    # Python date/datetime and Pandas Timestamp.
    if isinstance(value, (date, datetime, pd.Timestamp)):
        return value.isoformat()

    # Pandas Timedelta.
    if isinstance(value, pd.Timedelta):
        return value.total_seconds()

    # NumPy integer.
    if isinstance(value, np.integer):
        return int(value)

    # NumPy floating point.
    if isinstance(value, np.floating):
        if np.isnan(value) or np.isinf(value):
            return None
        return float(value)

    # NumPy boolean.
    if isinstance(value, np.bool_):
        return bool(value)

    # Dictionary.
    if isinstance(value, dict):
        return {
            str(key): json_safe(val)
            for key, val in value.items()
        }

    # List.
    if isinstance(value, list):
        return [json_safe(item) for item in value]

    # Tuple.
    if isinstance(value, tuple):
        return [json_safe(item) for item in value]

    # Pandas / NumPy missing values.
    if is_missing(value):
        return None

    return value


class AnalyticsEngine:

    def __init__(
        self,
        dataframe: pd.DataFrame,
        config: Optional[AnalyticsConfig] = None,
    ):
        self.config = config or AnalyticsConfig()

        self.df = dataframe.copy()

        self._prepare_data()
        self._validate_columns()

        self.conversations = self._build_conversation_view()

        logger.info(
            "Initialized analytics engine: rows=%d conversations=%d",
            len(self.df),
            len(self.conversations),
        )

    # ------------------------------------------------------------------------
    # DATA PREPARATION
    # ------------------------------------------------------------------------

    def _prepare_data(self) -> None:
        # Keep the first occurrence if the upstream CSV contains duplicate
        # column names (the current schema has recurring_after_solution twice).
        self.df = self.df.loc[
            :,
            ~self.df.columns.duplicated(keep="first"),
        ].copy()

        # Timestamp
        self.df["created_at"] = pd.to_datetime(
            self.df["created_at"],
            errors="coerce",
            utc=True,
        )

        # Numeric columns
        numeric_columns = [
            "confidence",
            "sentiment_score",
            "topic_probability",
            "issue_volume",
            "issue_growth_rate",
            "spike_score",
            "response_time_minutes",
            "category_sentiment_score",
        ]

        for column in numeric_columns:
            if column in self.df.columns:
                self.df[column] = safe_numeric(self.df[column])

        # Boolean columns
        boolean_columns = [
            "inbound",
            "new_issue",
            "recurring_issue",
            "recurring_after_solution",
            "emerging_issue",
            "spike_detected",
            "response_exists",
            "resolved_proxy",
            "escalation_proxy",
            "reopened_proxy",
        ]

        for column in boolean_columns:
            if column in self.df.columns:
                self.df[column] = self.df[column].map(safe_bool)

        # Normalize categorical fields
        self.df["sentiment"] = self.df["sentiment"].map(
            normalize_sentiment
        )

        for column in [
            "issue_category",
            "issue_subcategory",
            "customer_pain_point",
            "topic_id",
            "topic_keywords",
            "priority",
        ]:
            if column in self.df.columns:
                self.df[column] = self.df[column].map(
                    normalize_category
                )

        # Rows without an ID/timestamp cannot participate in reliable
        # time-series analytics.
        self.df = self.df.dropna(
            subset=["tweet_id", "created_at"]
        ).copy()

        self.df["date"] = self.df["created_at"].dt.date

    # ------------------------------------------------------------------------
    # VALIDATION
    # ------------------------------------------------------------------------

    def _validate_columns(self) -> None:
        missing = REQUIRED_COLUMNS - set(self.df.columns)

        if missing:
            raise ValueError(
                "Input dataset is missing required columns: "
                + ", ".join(sorted(missing))
            )

    # ------------------------------------------------------------------------
    # CONVERSATION VIEW
    # ------------------------------------------------------------------------

    def _build_conversation_view(self) -> pd.DataFrame:
        """
        Create one analytical record per conversation.

        This uses the upstream conversation_id and does not attempt to
        reconstruct reply relationships again.
        """

        records: list[dict[str, Any]] = []

        for conversation_id, group in self.df.groupby(
            "conversation_id",
            dropna=False,
        ):
            group = group.sort_values("created_at")

            customer_messages = group[group["inbound"]]
            support_messages = group[~group["inbound"]]

            start_time = group["created_at"].min()
            end_time = group["created_at"].max()

            duration_minutes = 0.0

            if pd.notna(start_time) and pd.notna(end_time):
                duration_minutes = (
                    end_time - start_time
                ).total_seconds() / 60.0

            customer_id = "Unknown"

            if not customer_messages.empty:
                customer_id = str(
                    customer_messages["author_id"].iloc[0]
                )
            elif not group.empty:
                customer_id = str(
                    group["author_id"].iloc[0]
                )

            records.append(
                {
                    "conversation_id": str(conversation_id),
                    "customer_id": customer_id,
                    "start_time": start_time,
                    "end_time": end_time,
                    "message_count": int(len(group)),
                    "customer_message_count": int(
                        len(customer_messages)
                    ),
                    "support_message_count": int(
                        len(support_messages)
                    ),
                    "conversation_duration_minutes": round(
                        duration_minutes,
                        2,
                    ),
                    "response_exists": bool(
                        group["response_exists"].any()
                    ),
                    "response_time_minutes": safe_mean(
                        group["response_time_minutes"]
                    ),
                    "resolved": bool(
                        group["resolved_proxy"].any()
                    ),
                    "escalated": bool(
                        group["escalation_proxy"].any()
                    ),
                    "reopened": bool(
                        group["reopened_proxy"].any()
                    ),
                    "new_issue": bool(
                        group["new_issue"].any()
                    ),
                    "recurring_issue": bool(
                        group["recurring_issue"].any()
                    ),
                    "recurring_after_solution": bool(
                        group["recurring_after_solution"].any()
                    ),
                    "emerging_issue": bool(
                        group["emerging_issue"].any()
                    ),
                    "upstream_spike_detected": bool(
                        group["spike_detected"].any()
                    ),
                    "upstream_spike_score": safe_mean(
                        group["spike_score"]
                    ),
                    "sentiment": self._dominant_sentiment(
                        group["sentiment"]
                    ),
                    "sentiment_score": safe_mean(
                        group["sentiment_score"]
                    ),
                    "priority": self._highest_priority(
                        group["priority"]
                    ),
                    "issue_category": self._dominant_value(
                        group["issue_category"]
                    ),
                    "issue_subcategory": self._dominant_value(
                        group["issue_subcategory"]
                    ),
                    "customer_pain_point": self._dominant_value(
                        group["customer_pain_point"]
                    ),
                    "topic_id": self._dominant_value(
                        group["topic_id"]
                    ),
                    "topic_keywords": self._dominant_value(
                        group["topic_keywords"]
                    ),
                }
            )

        if not records:
            return pd.DataFrame(
                columns=[
                    "conversation_id",
                    "customer_id",
                    "start_time",
                    "end_time",
                    "message_count",
                    "customer_message_count",
                    "support_message_count",
                    "conversation_duration_minutes",
                    "response_exists",
                    "response_time_minutes",
                    "resolved",
                    "escalated",
                    "reopened",
                    "new_issue",
                    "recurring_issue",
                    "recurring_after_solution",
                    "emerging_issue",
                    "upstream_spike_detected",
                    "upstream_spike_score",
                    "sentiment",
                    "sentiment_score",
                    "priority",
                    "issue_category",
                    "issue_subcategory",
                    "customer_pain_point",
                    "topic_id",
                    "topic_keywords",
                ]
            )

        return pd.DataFrame(records)

    # ------------------------------------------------------------------------
    # CONVERSATION HELPERS
    # ------------------------------------------------------------------------

    @staticmethod
    def _dominant_value(series: pd.Series) -> str:
        values = (
            series.map(normalize_category)
            .replace({"Unknown": np.nan})
            .dropna()
        )

        if values.empty:
            return "Unknown"

        return str(values.mode().iloc[0])

    @staticmethod
    def _dominant_sentiment(series: pd.Series) -> str:
        values = (
            series.map(normalize_sentiment)
            .replace({"unknown": np.nan})
            .dropna()
        )

        if values.empty:
            return "Unknown"

        return str(values.mode().iloc[0])

    @staticmethod
    def _highest_priority(series: pd.Series) -> str:
        priority_order = {
            "critical": 4,
            "high": 3,
            "medium": 2,
            "low": 1,
        }

        values = (
            series.map(normalize_category)
            .str.lower()
        )

        valid = [
            value
            for value in values
            if value in priority_order
        ]

        if not valid:
            return "Unknown"

        return max(
            valid,
            key=lambda value: priority_order[value],
        )

    # =========================================================================
    # 1. KPI
    # =========================================================================

    def calculate_kpi(self) -> dict[str, Any]:
        """
        Executive KPI layer.

        Required KPI:
        - issue reduction/recurrence trend
        - sentiment impact
        - mean response time
        - AI solution impact
        """

        return {
            "issue_trend": self._calculate_issue_trend(),
            "sentiment_impact": self._calculate_sentiment_impact(),
            "mean_response_time": {
                "value_minutes": safe_mean(
                    self.df["response_time_minutes"]
                ),
                "unit": "minutes",
            },
            "ai_solution_impact": (
                self._calculate_ai_solution_impact()
            ),
        }

    # =========================================================================
    # 2. ESCALATION RATE + SPIKE
    # =========================================================================

    def calculate_escalation(self) -> dict[str, Any]:
        total = len(self.conversations)
        escalated = int(self.conversations["escalated"].sum())

        return {
            "rate": {
                "value_percent": percentage(
                    escalated,
                    total,
                ),
                "escalated_conversations": escalated,
                "total_conversations": total,
            },
            "by_category": self._escalation_by_category(),
            "by_sentiment": self._escalation_by_sentiment(),
            "by_priority": self._escalation_by_priority(),
            "spike": self._calculate_escalation_spike(),
        }

    def _calculate_escalation_spike(
        self,
    ) -> dict[str, Any]:
        if self.conversations.empty:
            return {
                "detected": False,
                "current_rate_percent": 0.0,
                "baseline_rate_percent": 0.0,
                "z_score": None,
                "method": "rolling_z_score",
                "reason": "No conversation data.",
            }

        temp = self.conversations.copy()
        temp["date"] = temp["start_time"].dt.date

        daily = (
            temp.groupby("date")
            .agg(
                total_conversations=(
                    "conversation_id",
                    "count",
                ),
                escalated_conversations=(
                    "escalated",
                    "sum",
                ),
            )
            .sort_index()
        )

        daily["escalation_rate_percent"] = (
            daily["escalated_conversations"]
            / daily["total_conversations"].replace(
                0,
                np.nan,
            )
            * 100.0
        )

        # Previous observations only: avoids comparing the current day
        # against a rolling window that already contains the current day.
        previous_rates = daily[
            "escalation_rate_percent"
        ].shift(1)

        daily["baseline_rate_percent"] = (
            previous_rates
            .rolling(
                self.config.rolling_window_days,
                min_periods=3,
            )
            .mean()
        )

        daily["baseline_std"] = (
            previous_rates
            .rolling(
                self.config.rolling_window_days,
                min_periods=3,
            )
            .std()
        )

        daily["z_score"] = (
            (
                daily["escalation_rate_percent"]
                - daily["baseline_rate_percent"]
            )
            / daily["baseline_std"].replace(
                0,
                np.nan,
            )
        )

        daily["spike"] = (
            (
                daily["total_conversations"]
                >= self.config.min_conversations_for_spike
            )
            &
            (
                daily["z_score"]
                >= self.config.spike_z_threshold
            )
        )

        latest = daily.iloc[-1]

        current_rate = float(
            latest["escalation_rate_percent"]
        )

        baseline = (
            float(latest["baseline_rate_percent"])
            if pd.notna(
                latest["baseline_rate_percent"]
            )
            else 0.0
        )

        z_score = (
            round(float(latest["z_score"]), 2)
            if pd.notna(latest["z_score"])
            else None
        )

        return {
            "detected": bool(latest["spike"]),
            "current_rate_percent": round(
                current_rate,
                2,
            ),
            "baseline_rate_percent": round(
                baseline,
                2,
            ),
            "z_score": z_score,
            "threshold_z_score": (
                self.config.spike_z_threshold
            ),
            "minimum_conversations": (
                self.config.min_conversations_for_spike
            ),
            "method": "rolling_z_score",
            "daily_series": self._records(
                daily.reset_index()
            ),
        }

    # =========================================================================
    # 3. AVERAGE RESOLUTION TIME
    # =========================================================================

    def calculate_average_resolution_time(
        self,
    ) -> dict[str, Any]:
        """
        Current schema has resolved_proxy but no explicit resolution duration.

        Therefore this metric is explicitly labelled as a proxy:
            conversation end - conversation start

        Once resolution_time_minutes is added upstream, this method can switch
        to that field without changing the API contract.
        """

        resolved = self.conversations[
            self.conversations["resolved"]
        ]

        if resolved.empty:
            return {
                "value_minutes": 0.0,
                "median_minutes": 0.0,
                "resolved_conversations": 0,
                "measure_type": "proxy",
                "source": "conversation_duration",
            }

        return {
            "value_minutes": safe_mean(
                resolved[
                    "conversation_duration_minutes"
                ]
            ),
            "median_minutes": safe_median(
                resolved[
                    "conversation_duration_minutes"
                ]
            ),
            "resolved_conversations": int(
                len(resolved)
            ),
            "measure_type": "proxy",
            "source": "conversation_duration",
        }

    # =========================================================================
    # 4. CONTEXT
    # =========================================================================

    def calculate_context(self) -> dict[str, Any]:
        return {
            "total_conversations": int(
                len(self.conversations)
            ),
            "top_topics": top_counts(
                self.conversations["topic_id"],
                self.config.top_n,
                name_key="topic_id",
            ),
            "top_categories": top_counts(
                self.conversations["issue_category"],
                self.config.top_n,
                name_key="issue_category",
            ),
            "top_subcategories": top_counts(
                self.conversations["issue_subcategory"],
                self.config.top_n,
                name_key="issue_subcategory",
            ),
            "top_keywords": top_counts(
                self.conversations["topic_keywords"],
                self.config.top_n,
                name_key="keywords",
            ),
        }

    # =========================================================================
    # 5. SENTIMENT ANALYSIS
    # =========================================================================

    def calculate_sentiment_analysis(
        self,
    ) -> dict[str, Any]:
        total = len(self.conversations)

        counts = (
            self.conversations["sentiment"]
            .value_counts()
        )

        distribution = {}

        for sentiment in [
            "negative",
            "neutral",
            "positive",
        ]:
            count = int(
                counts.get(sentiment, 0)
            )

            distribution[sentiment] = {
                "count": count,
                "percentage": percentage(
                    count,
                    total,
                ),
            }

        # Preserve any unexpected sentiment labels.
        known = {
            "negative",
            "neutral",
            "positive",
        }

        for sentiment, count in counts.items():
            if sentiment not in known:
                distribution[str(sentiment)] = {
                    "count": int(count),
                    "percentage": percentage(
                        count,
                        total,
                    ),
                }

        return {
            "distribution": distribution,
            "average_sentiment_score": safe_mean(
                self.conversations["sentiment_score"]
            ),
            "category_sentiment": (
                self._category_sentiment()
            ),
        }

    # =========================================================================
    # 6. RESOLUTION RATE
    # =========================================================================

    def calculate_resolution_rate(
        self,
    ) -> dict[str, Any]:
        total = len(self.conversations)
        resolved = int(
            self.conversations["resolved"].sum()
        )

        return {
            "rate": {
                "value_percent": percentage(
                    resolved,
                    total,
                ),
                "resolved_conversations": resolved,
                "total_conversations": total,
            },
            "by_category": self._resolution_by_category(),
        }

    # =========================================================================
    # 7. CUSTOMER PAIN POINTS
    # =========================================================================

    def calculate_customer_pain_points(
        self,
    ) -> dict[str, Any]:
        pain_points = top_counts(
            self.conversations[
                "customer_pain_point"
            ],
            self.config.top_n,
            name_key="pain_point",
        )

        return {
            "total_unique_pain_points": int(
                self.conversations[
                    "customer_pain_point"
                ]
                .replace("Unknown", np.nan)
                .nunique()
            ),
            "top_pain_points": pain_points,
        }

    # =========================================================================
    # 8. NEW ISSUES
    # =========================================================================

    def calculate_new_issues(
        self,
    ) -> dict[str, Any]:
        new = self.conversations[
            self.conversations["new_issue"]
        ]

        total = len(self.conversations)

        return {
            "count": int(len(new)),
            "rate_percent": percentage(
                len(new),
                total,
            ),
            "categories": top_counts(
                new["issue_category"],
                self.config.top_n,
                name_key="issue_category",
            ),
            "subcategories": top_counts(
                new["issue_subcategory"],
                self.config.top_n,
                name_key="issue_subcategory",
            ),
        }

    # =========================================================================
    # 9. RECURRING ISSUES AFTER SOLUTION
    # =========================================================================

    def calculate_recurring_after_solution(
        self,
    ) -> dict[str, Any]:
        recurring = self.conversations[
            self.conversations[
                "recurring_after_solution"
            ]
        ]

        total = len(self.conversations)

        return {
            "count": int(len(recurring)),
            "rate_percent": percentage(
                len(recurring),
                total,
            ),
            "categories": top_counts(
                recurring["issue_category"],
                self.config.top_n,
                name_key="issue_category",
            ),
            "pain_points": top_counts(
                recurring["customer_pain_point"],
                self.config.top_n,
                name_key="pain_point",
            ),
        }

    # =========================================================================
    # 10. EMERGING ISSUES
    # =========================================================================

    def calculate_emerging_issues(
        self,
    ) -> dict[str, Any]:
        """
        Calculate true percentage growth from issue volume.

        Growth % =
            ((current_volume - previous_volume)
             / previous_volume) * 100

        The upstream issue_growth_rate column is intentionally not used
        because its scale was observed to produce values such as 1108.9
        and its unit is not guaranteed to be percentage.

        Issue volume is based on unique conversations per category/day.
        """

        if self.df.empty:
            return {
                "count": 0,
                "rate_percent": 0.0,
                "average_growth_rate_percent": 0.0,
                "growth_threshold_percent": (
                    self.config.issue_growth_threshold * 100
                ),
                "issues": [],
            }

        data = self.df.copy()

        data["date"] = pd.to_datetime(
            data["created_at"],
            errors="coerce",
            utc=True,
        ).dt.date

        data["issue_category"] = data[
            "issue_category"
        ].map(normalize_category)

        data = data[
            (data["issue_category"] != "Unknown")
            & data["date"].notna()
        ].copy()

        if data.empty:
            return {
                "count": 0,
                "rate_percent": 0.0,
                "average_growth_rate_percent": 0.0,
                "growth_threshold_percent": (
                    self.config.issue_growth_threshold * 100
                ),
                "issues": [],
            }

        daily_volume = (
            data.groupby(
                ["issue_category", "date"]
            )["conversation_id"]
            .nunique()
            .reset_index(
                name="current_volume"
            )
            .sort_values(
                ["issue_category", "date"]
            )
        )

        daily_volume["previous_volume"] = (
            daily_volume
            .groupby("issue_category")[
                "current_volume"
            ]
            .shift(1)
        )

        daily_volume[
            "growth_rate_percent"
        ] = np.where(
            daily_volume["previous_volume"] > 0,
            (
                (
                    daily_volume["current_volume"]
                    - daily_volume["previous_volume"]
                )
                / daily_volume["previous_volume"]
            )
            * 100.0,
            np.nan,
        )

        # Latest observation per issue.
        latest = (
            daily_volume
            .sort_values("date")
            .groupby(
                "issue_category",
                as_index=False,
            )
            .tail(1)
            .copy()
        )

        threshold_percent = (
            self.config.issue_growth_threshold
            * 100.0
        )

        latest["emerging"] = (
            latest["growth_rate_percent"]
            >= threshold_percent
        )

        emerging = latest[
            latest["emerging"]
        ].copy()

        total_categories = int(
            latest["issue_category"].nunique()
        )

        issue_records = []

        for _, row in emerging.iterrows():
            issue_records.append(
                {
                    "issue_category": str(
                        row["issue_category"]
                    ),
                    "current_volume": int(
                        row["current_volume"]
                    ),
                    "previous_volume": int(
                        row["previous_volume"]
                    ),
                    "growth_rate_percent": round(
                        float(
                            row[
                                "growth_rate_percent"
                            ]
                        ),
                        2,
                    ),
                    "period": str(
                        row["date"]
                    ),
                    "emerging": True,
                }
            )

        average_growth = (
            safe_mean(
                emerging[
                    "growth_rate_percent"
                ]
            )
            if not emerging.empty
            else 0.0
        )

        return {
            "count": int(len(emerging)),
            "rate_percent": percentage(
                len(emerging),
                total_categories,
            ),
            "average_growth_rate_percent": round(
                float(average_growth),
                2,
            ),
            "growth_threshold_percent": round(
                float(threshold_percent),
                2,
            ),
            "issues": sorted(
                issue_records,
                key=lambda item: item[
                    "growth_rate_percent"
                ],
                reverse=True,
            ),
        }

    # =========================================================================
    # KPI HELPERS
    # =========================================================================

    def _calculate_issue_trend(
        self,
    ) -> dict[str, Any]:
        if self.conversations.empty:
            return {
                "status": "no_data",
                "direction": "unknown",
                "change_percent": 0.0,
                "recurring_rate_percent": 0.0,
            }

        temp = self.conversations.copy()
        temp["date"] = temp[
            "start_time"
        ].dt.date

        daily = (
            temp.groupby("date")
            .agg(
                issue_volume=(
                    "conversation_id",
                    "nunique",
                ),
                recurring_conversations=(
                    "recurring_after_solution",
                    "sum",
                ),
            )
            .sort_index()
        )

        if len(daily) < self.config.minimum_trend_periods:
            return {
                "status": "insufficient_history",
                "direction": "unknown",
                "change_percent": 0.0,
                "recurring_rate_percent": percentage(
                    self.conversations[
                        "recurring_after_solution"
                    ].sum(),
                    len(self.conversations),
                ),
                "daily": self._records(
                    daily.reset_index()
                ),
            }

        midpoint = len(daily) // 2

        first_period = daily.iloc[:midpoint]
        second_period = daily.iloc[midpoint:]

        previous_average = float(
            first_period[
                "issue_volume"
            ].mean()
        )

        current_average = float(
            second_period[
                "issue_volume"
            ].mean()
        )

        change_percent = (
            (
                current_average
                - previous_average
            )
            / previous_average
            * 100.0
            if previous_average > 0
            else 0.0
        )

        if change_percent < -5:
            direction = "reduced"
        elif change_percent > 5:
            direction = "increased"
        else:
            direction = "stable"

        recurring_rate = percentage(
            self.conversations[
                "recurring_after_solution"
            ].sum(),
            len(self.conversations),
        )

        return {
            "status": "available",
            "direction": direction,
            "change_percent": round(
                change_percent,
                2,
            ),
            "previous_average_issue_volume": round(
                previous_average,
                2,
            ),
            "current_average_issue_volume": round(
                current_average,
                2,
            ),
            "recurring_after_solution_rate_percent":
                recurring_rate,
            "daily": self._records(
                daily.reset_index()
            ),
        }

    def _calculate_sentiment_impact(
        self,
    ) -> dict[str, Any]:
        """
        Compare resolution, escalation and response time by
        negative / neutral / positive sentiment.

        Neutral is deliberately included.
        """

        data = self.conversations.copy()

        data["sentiment"] = data[
            "sentiment"
        ].map(normalize_sentiment)

        result: dict[str, Any] = {}

        for sentiment in [
            "negative",
            "neutral",
            "positive",
        ]:
            group = data[
                data["sentiment"] == sentiment
            ]

            result[sentiment] = {
                "conversation_count": int(
                    len(group)
                ),
                "resolution_rate_percent":
                    percentage(
                        group["resolved"].sum(),
                        len(group),
                    ),
                "escalation_rate_percent":
                    percentage(
                        group["escalated"].sum(),
                        len(group),
                    ),
                "average_response_time_minutes":
                    safe_mean(
                        self.df[
                            self.df[
                                "sentiment"
                            ] == sentiment
                        ]["response_time_minutes"]
                    ),
            }

        return result

    def _calculate_ai_solution_impact(
        self,
    ) -> dict[str, Any]:
        """
        Calculate AI-solution impact only when the required
        upstream fields exist.

        Current dataset does not contain these fields, so this
        returns a clear not_available status.
        """

        available = set(self.df.columns)

        required = {
            "ai_solution_proposed",
            "ai_solution_success",
        }

        if not required.issubset(available):
            return {
                "status": "not_available",
                "reason": (
                    "AI solution proposal/success fields are "
                    "not present in the current dataset."
                ),
                "required_fields": sorted(
                    required
                ),
            }

        proposed = self.df[
            self.df[
                "ai_solution_proposed"
            ].map(safe_bool)
        ]

        if proposed.empty:
            return {
                "status": "available",
                "solutions_proposed": 0,
                "successful_solutions": 0,
                "success_rate_percent": 0.0,
            }

        successful = proposed[
            proposed[
                "ai_solution_success"
            ].map(safe_bool)
        ]

        result = {
            "status": "available",
            "solutions_proposed": int(
                len(proposed)
            ),
            "successful_solutions": int(
                len(successful)
            ),
            "success_rate_percent": percentage(
                len(successful),
                len(proposed),
            ),
        }

        if {
            "pre_solution_sentiment",
            "post_solution_sentiment",
        }.issubset(available):

            before = safe_numeric(
                proposed[
                    "pre_solution_sentiment"
                ]
            )

            after = safe_numeric(
                proposed[
                    "post_solution_sentiment"
                ]
            )

            improvement = (
                after - before
            ).dropna()

            result[
                "average_sentiment_improvement"
            ] = safe_mean(improvement)

        return result

    # =========================================================================
    # BREAKDOWNS
    # =========================================================================

    def _category_sentiment(
        self,
    ) -> list[dict[str, Any]]:
        records = []

        for category, group in (
            self.conversations.groupby(
                "issue_category"
            )
        ):
            negative_count = int(
                (
                    group["sentiment"]
                    == "negative"
                ).sum()
            )

            records.append(
                {
                    "issue_category": str(
                        category
                    ),
                    "conversation_count": int(
                        len(group)
                    ),
                    "average_sentiment_score":
                        safe_mean(
                            group[
                                "sentiment_score"
                            ]
                        ),
                    "negative_rate_percent":
                        percentage(
                            negative_count,
                            len(group),
                        ),
                }
            )

        return sorted(
            records,
            key=lambda x: x[
                "conversation_count"
            ],
            reverse=True,
        )[: self.config.top_n]

    def _escalation_by_category(
        self,
    ) -> list[dict[str, Any]]:
        records = []

        for category, group in (
            self.conversations.groupby(
                "issue_category"
            )
        ):
            records.append(
                {
                    "issue_category": str(
                        category
                    ),
                    "total_conversations": int(
                        len(group)
                    ),
                    "escalated_conversations": int(
                        group["escalated"].sum()
                    ),
                    "escalation_rate_percent":
                        percentage(
                            group[
                                "escalated"
                            ].sum(),
                            len(group),
                        ),
                }
            )

        return sorted(
            records,
            key=lambda x: x[
                "escalation_rate_percent"
            ],
            reverse=True,
        )[: self.config.top_n]

    def _escalation_by_sentiment(
        self,
    ) -> list[dict[str, Any]]:
        records = []

        for sentiment, group in (
            self.conversations.groupby(
                "sentiment"
            )
        ):
            records.append(
                {
                    "sentiment": str(
                        sentiment
                    ),
                    "total_conversations": int(
                        len(group)
                    ),
                    "escalated_conversations": int(
                        group["escalated"].sum()
                    ),
                    "escalation_rate_percent":
                        percentage(
                            group[
                                "escalated"
                            ].sum(),
                            len(group),
                        ),
                }
            )

        return sorted(
            records,
            key=lambda x: x[
                "escalation_rate_percent"
            ],
            reverse=True,
        )

    def _escalation_by_priority(
        self,
    ) -> list[dict[str, Any]]:
        records = []

        for priority, group in (
            self.conversations.groupby(
                "priority"
            )
        ):
            records.append(
                {
                    "priority": str(
                        priority
                    ),
                    "total_conversations": int(
                        len(group)
                    ),
                    "escalated_conversations": int(
                        group["escalated"].sum()
                    ),
                    "escalation_rate_percent":
                        percentage(
                            group[
                                "escalated"
                            ].sum(),
                            len(group),
                        ),
                }
            )

        return sorted(
            records,
            key=lambda x: x[
                "escalation_rate_percent"
            ],
            reverse=True,
        )

    def _resolution_by_category(
        self,
    ) -> list[dict[str, Any]]:
        records = []

        for category, group in (
            self.conversations.groupby(
                "issue_category"
            )
        ):
            records.append(
                {
                    "issue_category": str(
                        category
                    ),
                    "total_conversations": int(
                        len(group)
                    ),
                    "resolved_conversations": int(
                        group["resolved"].sum()
                    ),
                    "resolution_rate_percent":
                        percentage(
                            group[
                                "resolved"
                            ].sum(),
                            len(group),
                        ),
                }
            )

        return sorted(
            records,
            key=lambda x: x[
                "resolution_rate_percent"
            ],
            reverse=True,
        )[: self.config.top_n]

    # =========================================================================
    # FINAL DATABASE DOCUMENT
    # =========================================================================

    def run_all(self) -> dict[str, Any]:
        """
        Return one stable database-ready analytics document.

        Each metric is a separate top-level object. This is the database/API
        contract for MongoDB and FastAPI, and keeps the frontend independent
        from the internal Python function structure.
        """

        logger.info(
            "Running complete analytics pipeline..."
        )

        if self.df.empty:
            raise ValueError(
                "No valid rows remain after data preparation."
            )

        data_period_start = (
            self.df["created_at"].min()
        )

        data_period_end = (
            self.df["created_at"].max()
        )

        # Calculate escalation once so rate and spike use the same snapshot.
        escalation_result = self.calculate_escalation()

        result = {
            "schema_version": "1.0.0",

            # Common metadata for this analytics snapshot.
            "metadata": {
                "generated_at": pd.Timestamp.utcnow(),
                "data_period": {
                    "start": data_period_start,
                    "end": data_period_end,
                },
                "rows_processed": int(
                    len(self.df)
                ),
                "conversations_processed": int(
                    len(self.conversations)
                ),
            },

            # Executive KPI
            "kpi": self.calculate_kpi(),

            # --------------------------------------------------------------
            # Every metric is a separate top-level object.
            # This is the MongoDB / FastAPI output contract.
            # --------------------------------------------------------------
            "escalation_rate": escalation_result,

            "escalation_spike": escalation_result["spike"],

            "average_resolution_time": (
                self.calculate_average_resolution_time()
            ),

            "context": (
                self.calculate_context()
            ),

            "sentiment_analysis": (
                self.calculate_sentiment_analysis()
            ),

            "resolution_rate": (
                self.calculate_resolution_rate()
            ),

            "customer_pain_points": (
                self.calculate_customer_pain_points()
            ),

            "new_issues": (
                self.calculate_new_issues()
            ),

            "recurring_issues_after_solution": (
                self.calculate_recurring_after_solution()
            ),

            "emerging_issues": (
                self.calculate_emerging_issues()
            ),

            # Data-quality / interpretation metadata
            "data_quality": {
                "duplicate_columns_removed": True,
                "proxy_fields_used": [
                    "resolved_proxy",
                    "escalation_proxy",
                    "reopened_proxy",
                ],
                "average_resolution_time_is_proxy": True,
                "ai_solution_impact_available": (
                    "ai_solution_proposed"
                    in self.df.columns
                    and
                    "ai_solution_success"
                    in self.df.columns
                ),
            },
        }

        result = json_safe(result)

        logger.info(
            "Analytics pipeline completed successfully."
        )

        return result

    # =========================================================================
    # SERIALIZATION
    # =========================================================================

    @staticmethod
    def _records(
        dataframe: pd.DataFrame,
    ) -> list[dict[str, Any]]:
        clean = dataframe.copy()

        clean = clean.replace(
            {
                np.nan: None,
                np.inf: None,
                -np.inf: None,
            }
        )

        return [
            json_safe(record)
            for record in clean.to_dict(
                orient="records"
            )
        ]

    @staticmethod
    def save_json(
        result: dict[str, Any],
        output_path: str | Path,
    ) -> None:
        output_path = Path(output_path)

        output_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        # Final defensive conversion so no Python/Pandas date,
        # NumPy scalar, or other non-JSON value reaches json.dump().
        serializable_result = json_safe(result)

        with output_path.open(
            "w",
            encoding="utf-8",
        ) as file:
            json.dump(
                serializable_result,
                file,
                indent=2,
                ensure_ascii=False,
                allow_nan=False,
            )

        logger.info(
            "Analytics document saved to %s",
            output_path,
        )


# ============================================================================
# DATA LOADING
# ============================================================================

def load_dataset(
    input_path: str | Path,
) -> pd.DataFrame:
    """
    Load CSV/XLSX/XLS.

    Malformed CSV rows are not silently skipped because doing so would
    corrupt analytics such as escalation rate and resolution rate.
    """

    input_path = Path(input_path)

    if not input_path.exists():
        raise FileNotFoundError(
            f"Dataset not found: {input_path}"
        )

    logger.info(
        "Loading dataset: %s",
        input_path,
    )

    suffix = input_path.suffix.lower()

    if suffix == ".csv":
        return pd.read_csv(
            input_path,
            low_memory=False,
        )

    if suffix in {".xlsx", ".xls"}:
        return pd.read_excel(
            input_path
        )

    raise ValueError(
        "Unsupported dataset format. "
        "Use CSV, XLSX or XLS."
    )


# ============================================================================
# CLI
# ============================================================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Customer Support Analytics Engine"
        )
    )

    parser.add_argument(
        "--input",
        required=True,
        help="Path to transformed CSV/XLSX/XLS dataset.",
    )

    parser.add_argument(
        "--output",
        default="analytics_output.json",
        help="Path for database-ready JSON output.",
    )

    parser.add_argument(
        "--top-n",
        type=int,
        default=10,
        help="Number of top categories/items to return.",
    )

    parser.add_argument(
        "--growth-threshold",
        type=float,
        default=0.20,
        help=(
            "Emerging issue threshold as a decimal. "
            "0.20 means 20%% growth."
        ),
    )

    parser.add_argument(
        "--spike-z-threshold",
        type=float,
        default=2.0,
        help="Z-score threshold for escalation spike detection.",
    )

    parser.add_argument(
        "--rolling-window-days",
        type=int,
        default=7,
        help="Historical window for escalation spike baseline.",
    )

    args = parser.parse_args()

    config = AnalyticsConfig(
        top_n=max(1, args.top_n),
        issue_growth_threshold=max(
            0.0,
            args.growth_threshold,
        ),
        spike_z_threshold=max(
            0.0,
            args.spike_z_threshold,
        ),
        rolling_window_days=max(
            1,
            args.rolling_window_days,
        ),
    )

    dataframe = load_dataset(
        args.input
    )

    engine = AnalyticsEngine(
        dataframe,
        config=config,
    )

    result = engine.run_all()

    engine.save_json(
        result,
        args.output,
    )

    print(
        json.dumps(
            result,
            indent=2,
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
