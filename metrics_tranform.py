# ============================================================
# CUSTOMER COMPLAINT INTELLIGENCE
# 3M+ ROWS | SINGLE OUTPUT DATASET | STREAMING VERSION
#
# INPUT:
#   customer_complaints_clustered.csv
#
# OUTPUT:
#   customer_complaint_intelligence.csv
#
# FIXES INCLUDED:
#   1. String literals inside Polars expressions use pl.lit()
#      (fixes: ColumnNotFoundError: unable to find column "improving")
#   2. Uses replace_strict() instead of deprecated replace(default=...)
#   3. Safely handles topic_cluster when it is String
#   4. Keeps the 3M+ row pipeline lazy/streaming
#   5. Does not collect the complete dataset into RAM
# ============================================================

import re
import time
import shutil
from pathlib import Path

import polars as pl


# ============================================================
# 1. CONFIGURATION
# ============================================================

BASE_DIR = Path(r"C:\Users\pooja\OneDrive\Desktop\CTS")

INPUT_FILE = BASE_DIR / "customer_complaints_clustered.csv"
OUTPUT_FILE = BASE_DIR / "customer_complaint_intelligence.csv"

REQUIRED_COLUMNS = [
    "tweet_id",
    "author_id",
    "inbound",
    "created_at",
    "text",
    "response_tweet_id",
    "in_response_to_tweet_id",
    "sentiment",
    "topic_cluster",
    "topic",
]


# ============================================================
# 2. CATEGORY KEYWORDS
# ============================================================

CATEGORY_KEYWORDS = {
    "network": [
        "network", "internet", "signal", "connection", "connectivity",
        "wifi", "5g", "4g", "coverage", "mobile data", "outage",
        "disconnect", "slow",
    ],

    "billing": [
        "bill", "billing", "charged", "charge", "payment", "refund",
        "invoice", "price", "cost", "fee", "overcharged",
    ],

    "app_issues": [
        "app", "application", "login", "password", "crash", "crashed",
        "update", "install", "download", "bug",
    ],

    "account": [
        "account", "profile", "username", "password", "login",
        "register", "registration", "verification",
    ],

    "customer_service": [
        "agent", "support", "customer service", "representative",
        "help", "response", "call", "service",
    ],

    "subscription": [
        "plan", "subscription", "package", "upgrade", "downgrade",
        "renewal", "contract",
    ],

    "refund": [
        "refund", "money back", "reimbursement", "return payment",
    ],

    "delivery": [
        "delivery", "deliver", "shipping", "package", "order", "dispatch",
    ],

    "technical_issue": [
        "error", "bug", "broken", "failure", "failed", "technical",
        "system",
    ],
}


PAIN_POINT_MAP = {
    "network": "Poor or unstable connectivity",
    "billing": "Incorrect or unexpected charges",
    "app_issues": "Application malfunction",
    "account": "Account access problem",
    "customer_service": "Poor customer support",
    "subscription": "Plan or subscription problem",
    "refund": "Refund delay or failure",
    "delivery": "Delivery or order issue",
    "technical_issue": "Technical failure",
    "other": "Unclassified customer issue",
}


ESCALATION_KEYWORDS = [
    "escalate",
    "escalation",
    "manager",
    "supervisor",
    "legal",
    "complaint",
    "urgent",
    "immediately",
    "consumer court",
    "police",
    "report",
    "unacceptable",
    "third time",
    "again",
]


RESOLUTION_KEYWORDS = [
    "resolved",
    "resolution",
    "fixed",
    "working now",
    "works now",
    "problem solved",
    "issue solved",
    "thank you",
    "thanks",
    "appreciate",
    "sorted",
    "done",
    "restored",
]


# ============================================================
# 3. HELPERS
# ============================================================

def keyword_pattern(keywords):
    return "|".join(
        rf"\b{re.escape(k)}\b"
        for k in keywords
    )


def contains_pattern(keywords):
    return "|".join(
        re.escape(k)
        for k in keywords
    )


def print_header(title):
    print("\n" + "=" * 100)
    print(title)
    print("=" * 100)


# ============================================================
# 4. START
# ============================================================

start_time = time.perf_counter()

print_header("CUSTOMER COMPLAINT INTELLIGENCE PIPELINE")

print(f"Input : {INPUT_FILE}")
print(f"Output: {OUTPUT_FILE}")


# ============================================================
# 5. FILE VALIDATION
# ============================================================

if not INPUT_FILE.exists():
    raise FileNotFoundError(
        f"\nInput file not found:\n{INPUT_FILE}"
    )

OUTPUT_FILE.parent.mkdir(
    parents=True,
    exist_ok=True,
)


# ============================================================
# 6. DISK SPACE
# ============================================================

disk = shutil.disk_usage(OUTPUT_FILE.parent)
free_gb = disk.free / (1024 ** 3)

print(f"\nFree disk space: {free_gb:.2f} GB")

if free_gb < 5:
    raise RuntimeError(
        "\nNot enough free disk space.\n"
        f"Available: {free_gb:.2f} GB\n\n"
        "Please free at least 5-10 GB before processing "
        "the propagated CSV."
    )


# ============================================================
# 7. LAZY CSV SCAN
# ============================================================

print_header("STEP 1 - LAZY CSV SCAN")

lf = pl.scan_csv(
    str(INPUT_FILE),
    infer_schema_length=10000,
    ignore_errors=True,
    low_memory=True,
)

schema = lf.collect_schema()
columns = schema.names()

print(f"Columns found: {len(columns)}")

missing = [
    c for c in REQUIRED_COLUMNS
    if c not in columns
]

if missing:
    raise ValueError(
        f"\nMissing required columns:\n{missing}"
    )


# ============================================================
# 8. ROW COUNT
# ============================================================

print_header("STEP 2 - INPUT VALIDATION")

original_row_count = (
    lf.select(pl.len())
    .collect(engine="streaming")
    .item()
)

print(f"Input rows: {original_row_count:,}")


# ============================================================
# 9. BASIC CLEANING
# ============================================================

print_header("STEP 3 - CLEAN TEXT / DATE / SENTIMENT")

lf = lf.with_columns(

    # --------------------------------------------------------
    # TEXT
    # --------------------------------------------------------
    pl.col("text")
    .fill_null("")
    .cast(pl.String)
    .str.to_lowercase()
    .str.replace_all(
        r"https?://\S+|www\.\S+",
        " ",
    )
    .str.replace_all(
        r"@\w+",
        " ",
    )
    .str.replace_all(
        r"<[^>]+>",
        " ",
    )
    # Removes emoji and other non-ASCII symbols.
    .str.replace_all(
        r"[^a-z0-9\s!?'.]",
        " ",
    )
    .str.replace_all(
        r"\s+",
        " ",
    )
    .str.strip_chars()
    .alias("clean_text"),

    # --------------------------------------------------------
    # SENTIMENT
    # --------------------------------------------------------
    pl.col("sentiment")
    .fill_null("unknown")
    .cast(pl.String)
    .str.to_lowercase()
    .str.strip_chars()
    .alias("sentiment"),

    # --------------------------------------------------------
    # TOPIC
    # --------------------------------------------------------
    pl.col("topic")
    .fill_null("unknown")
    .cast(pl.String)
    .str.to_lowercase()
    .str.strip_chars()
    .alias("topic"),

    # --------------------------------------------------------
    # TOPIC CLUSTER
    # --------------------------------------------------------
    # Your actual input can contain this as String.
    pl.col("topic_cluster")
    .cast(pl.String)
    .fill_null("-1")
    .alias("topic_cluster"),

    # --------------------------------------------------------
    # DATETIME
    # --------------------------------------------------------
    pl.col("created_at")
    .cast(pl.String)
    .str.strptime(
        pl.Datetime,
        strict=False,
    )
    .alias("_created_dt"),

    # --------------------------------------------------------
    # AUTHOR
    # --------------------------------------------------------
    pl.col("author_id")
    .cast(pl.String)
    .fill_null("unknown")
    .alias("author_id"),

    # --------------------------------------------------------
    # TWEET ID
    # --------------------------------------------------------
    pl.col("tweet_id")
    .cast(pl.String)
    .alias("tweet_id"),

    # --------------------------------------------------------
    # RESPONSE ID
    # --------------------------------------------------------
    pl.col("response_tweet_id")
    .cast(pl.String)
    .alias("_response_lookup_id"),
)


# ============================================================
# 10. SENTIMENT SCORE
# ============================================================

print_header("STEP 4 - SENTIMENT ANALYSIS")

lf = lf.with_columns(
    pl.when(
        pl.col("sentiment") == pl.lit("positive")
    )
    .then(pl.lit(1))
    .when(
        pl.col("sentiment") == pl.lit("negative")
    )
    .then(pl.lit(-1))
    .otherwise(pl.lit(0))
    .cast(pl.Int8)
    .alias("_sentiment_score")
)


# ============================================================
# 11. SENTIMENT TRAJECTORY
# ============================================================

lf = lf.with_columns(
    pl.col("_sentiment_score")
    .shift(1)
    .over(
        "author_id",
        order_by="_created_dt",
    )
    .alias("_previous_sentiment")
)

lf = lf.with_columns(
    (
        pl.col("_sentiment_score")
        - pl.col("_previous_sentiment")
    )
    .fill_null(0)
    .alias("sentiment_change")
)

# IMPORTANT:
# Always use pl.lit("text") for literal strings.
# Without pl.lit(), Polars interprets "improving" as a
# column name and raises:
# ColumnNotFoundError: unable to find column "improving"

lf = lf.with_columns(
    pl.when(
        pl.col("sentiment_change") > 0
    )
    .then(pl.lit("improving"))
    .when(
        pl.col("sentiment_change") < 0
    )
    .then(pl.lit("declining"))
    .otherwise(pl.lit("stable"))
    .alias("sentiment_trajectory")
)


# ============================================================
# 12. COMPLAINT CATEGORY
# ============================================================

print_header("STEP 5 - CUSTOMER PAIN POINT")

category_names = list(CATEGORY_KEYWORDS.keys())
score_columns = []

for category, keywords in CATEGORY_KEYWORDS.items():

    score_column = f"_score_{category}"
    score_columns.append(score_column)

    lf = lf.with_columns(
        pl.col("clean_text")
        .str.count_matches(
            keyword_pattern(keywords)
        )
        .alias(score_column)
    )


best_category = pl.lit(category_names[0])
best_score = pl.col(score_columns[0])

for category, score_column in zip(
    category_names[1:],
    score_columns[1:],
):
    condition = (
        pl.col(score_column)
        > best_score
    )

    best_category = (
        pl.when(condition)
        .then(pl.lit(category))
        .otherwise(best_category)
    )

    best_score = (
        pl.when(condition)
        .then(pl.col(score_column))
        .otherwise(best_score)
    )


lf = lf.with_columns(
    pl.when(
        best_score == 0
    )
    .then(pl.lit("other"))
    .otherwise(best_category)
    .alias("complaint_category")
)

lf = lf.drop(score_columns)


# ============================================================
# 13. CUSTOMER PAIN POINT
# ============================================================

# replace(default=...) is deprecated in current Polars.
# replace_strict(..., default=...) is the supported version.

lf = lf.with_columns(
    pl.col("complaint_category")
    .replace_strict(
        PAIN_POINT_MAP,
        default=PAIN_POINT_MAP["other"],
    )
    .alias("customer_pain_point")
)


# ============================================================
# 14. ESCALATION / RESOLUTION
# ============================================================

print_header("STEP 6 - ESCALATION / RESOLUTION")

lf = lf.with_columns(

    pl.col("clean_text")
    .str.contains(
        contains_pattern(ESCALATION_KEYWORDS)
    )
    .cast(pl.Int8)
    .alias("escalation_flag"),

    pl.col("clean_text")
    .str.contains(
        contains_pattern(RESOLUTION_KEYWORDS)
    )
    .cast(pl.Int8)
    .alias("resolution_flag"),
)


# ============================================================
# 15. RESPONSE TIME
# ============================================================

print_header("STEP 7 - RESPONSE TIME")

response_lookup = (
    lf.select(
        pl.col("tweet_id")
        .alias("_response_id"),

        pl.col("_created_dt")
        .alias("_response_time"),
    )
)

lf = lf.join(
    response_lookup,
    left_on="_response_lookup_id",
    right_on="_response_id",
    how="left",
)

lf = lf.with_columns(

    pl.when(
        (
            pl.col("inbound")
            .cast(pl.String)
            .str.to_lowercase()
            .is_in(["true", "1", "yes"])
        )
        &
        pl.col("_response_time").is_not_null()
        &
        pl.col("_created_dt").is_not_null()
    )
    .then(
        (
            pl.col("_response_time")
            - pl.col("_created_dt")
        )
        .dt.total_seconds()
        / 60
    )
    .otherwise(None)
    .alias("response_time_minutes")
)

lf = lf.with_columns(
    pl.when(
        (
            pl.col("response_time_minutes") >= 0
        )
        &
        (
            pl.col("response_time_minutes") <= 100000
        )
    )
    .then(pl.col("response_time_minutes"))
    .otherwise(None)
    .alias("response_time_minutes")
)


# ============================================================
# 16. CUSTOMER / TOPIC FREQUENCY
# ============================================================

print_header("STEP 8 - NEW / RECURRING / REOPENED ISSUES")

lf = lf.with_columns(
    pl.len()
    .over(
        ["author_id", "topic"]
    )
    .alias("customer_topic_frequency")
)


# ============================================================
# 17. NEW ISSUE
# ============================================================

lf = lf.with_columns(
    (
        pl.col("_created_dt")
        ==
        pl.col("_created_dt")
        .min()
        .over(["author_id", "topic"])
    )
    .cast(pl.Int8)
    .alias("new_issue")
)


# ============================================================
# 18. RECURRING ISSUE
# ============================================================

lf = lf.with_columns(
    (
        pl.col("customer_topic_frequency") > 1
    )
    .cast(pl.Int8)
    .alias("recurring_issue")
)


# ============================================================
# 19. RESOLVED BEFORE THIS ROW
# ============================================================

lf = lf.with_columns(
    pl.col("resolution_flag")
    .shift(1)
    .fill_null(0)
    .cum_max()
    .over(
        ["author_id", "topic"],
        order_by="_created_dt",
    )
    .alias("_resolved_before")
)


# ============================================================
# 20. RECURRING AFTER SOLUTION
# ============================================================

lf = lf.with_columns(
    (
        (pl.col("recurring_issue") == 1)
        &
        (pl.col("_resolved_before") == 1)
        &
        (pl.col("resolution_flag") == 0)
    )
    .cast(pl.Int8)
    .alias("recurring_issue_after_solution")
)


# ============================================================
# 21. REOPENED ISSUE
# ============================================================

lf = lf.with_columns(
    pl.col("recurring_issue_after_solution")
    .alias("reopened_after_solution")
)


# ============================================================
# 22. TOPIC STATISTICS
# ============================================================

print_header("STEP 9 - VOLUME / SENTIMENT IMPACT")

topic_stats = (
    lf.group_by("topic")
    .agg(

        pl.len()
        .alias("topic_volume"),

        (
            (
                pl.col("sentiment")
                == pl.lit("negative")
            )
            .cast(pl.Int8)
            .mean()
            * 100
        )
        .alias("negative_sentiment_pct"),

        (
            (
                pl.col("sentiment")
                == pl.lit("positive")
            )
            .cast(pl.Int8)
            .mean()
            * 100
        )
        .alias("positive_sentiment_pct"),
    )
    .with_columns(
        (
            pl.col("topic_volume")
            *
            (
                pl.col("negative_sentiment_pct")
                / 100
            )
        )
        .alias("volume_sentiment_impact")
    )
)

lf = lf.join(
    topic_stats,
    on="topic",
    how="left",
)


# ============================================================
# 23. PAIN POINT RANKING
# ============================================================

pain_ranking = (
    lf.group_by("customer_pain_point")
    .agg(
        pl.len()
        .alias("pain_point_volume")
    )
    .sort(
        "pain_point_volume",
        descending=True,
    )
    .with_row_index(
        "pain_point_rank",
        offset=1,
    )
)

lf = lf.join(
    pain_ranking,
    on="customer_pain_point",
    how="left",
)


# ============================================================
# 24. GLOBAL BUSINESS METRICS
# ============================================================

print_header("STEP 10 - GLOBAL BUSINESS METRICS")

global_metrics = (
    lf.select(

        pl.col("response_time_minutes")
        .mean()
        .fill_null(0)
        .alias("mean_response_time"),

        pl.col("resolution_flag")
        .mean()
        .fill_null(0)
        .alias("global_resolution_rate"),

        pl.col("escalation_flag")
        .mean()
        .fill_null(0)
        .alias("global_escalation_rate"),

        pl.col("reopened_after_solution")
        .mean()
        .fill_null(0)
        .alias("global_reopen_rate"),

        pl.col("_sentiment_score")
        .mean()
        .fill_null(0)
        .alias("global_sentiment"),
    )
    .collect(engine="streaming")
)

mean_response_time = (
    global_metrics["mean_response_time"].item()
    or 0.0
)

global_resolution_rate = (
    global_metrics["global_resolution_rate"].item()
    or 0.0
)

global_escalation_rate = (
    global_metrics["global_escalation_rate"].item()
    or 0.0
)

global_reopen_rate = (
    global_metrics["global_reopen_rate"].item()
    or 0.0
)

global_sentiment = (
    global_metrics["global_sentiment"].item()
    or 0.0
)

print(
    f"Mean response time : {mean_response_time:.2f} minutes"
)

print(
    f"Resolution rate    : {global_resolution_rate * 100:.2f}%"
)

print(
    f"Escalation rate    : {global_escalation_rate * 100:.2f}%"
)

print(
    f"Reopen rate        : {global_reopen_rate * 100:.2f}%"
)


# ============================================================
# 25. TIME WINDOW
# ============================================================

print_header("STEP 11 - TREND ANALYSIS")

max_date = (
    lf.select(
        pl.col("_created_dt").max()
    )
    .collect(engine="streaming")
    .item()
)


if max_date is not None:

    recent_cutoff = (
        max_date
        - pl.duration(days=7)
    )

    previous_cutoff = (
        max_date
        - pl.duration(days=14)
    )

    trend_metrics = (
        lf.select(

            pl.col(
                "recurring_issue_after_solution"
            )
            .filter(
                pl.col("_created_dt")
                >= recent_cutoff
            )
            .sum()
            .fill_null(0)
            .alias("recent_recurring"),

            pl.col(
                "recurring_issue_after_solution"
            )
            .filter(
                (
                    pl.col("_created_dt")
                    >= previous_cutoff
                )
                &
                (
                    pl.col("_created_dt")
                    < recent_cutoff
                )
            )
            .sum()
            .fill_null(0)
            .alias("previous_recurring"),

            pl.col(
                "_sentiment_score"
            )
            .filter(
                pl.col("_created_dt")
                >= recent_cutoff
            )
            .mean()
            .fill_null(0)
            .alias("recent_sentiment"),

            pl.col(
                "_sentiment_score"
            )
            .filter(
                (
                    pl.col("_created_dt")
                    >= previous_cutoff
                )
                &
                (
                    pl.col("_created_dt")
                    < recent_cutoff
                )
            )
            .mean()
            .fill_null(0)
            .alias("previous_sentiment"),
        )
        .collect(engine="streaming")
    )

    recent_recurring = (
        trend_metrics["recent_recurring"].item()
        or 0
    )

    previous_recurring = (
        trend_metrics["previous_recurring"].item()
        or 0
    )

    recent_sentiment = (
        trend_metrics["recent_sentiment"].item()
        or 0.0
    )

    previous_sentiment = (
        trend_metrics["previous_sentiment"].item()
        or 0.0
    )

    if previous_recurring > 0:
        recurring_reduction_pct = (
            (
                previous_recurring
                - recent_recurring
            )
            / previous_recurring
            * 100
        )
    else:
        recurring_reduction_pct = 0.0

    improved_sentiment_trend = (
        recent_sentiment
        - previous_sentiment
    )

else:

    recent_cutoff = None
    previous_cutoff = None

    recent_recurring = 0
    previous_recurring = 0

    recurring_reduction_pct = 0.0
    improved_sentiment_trend = 0.0


print(
    f"Recurring issue reduction: "
    f"{recurring_reduction_pct:.2f}%"
)

print(
    f"Improved sentiment trend: "
    f"{improved_sentiment_trend:.4f}"
)


# ============================================================
# 26. EMERGING ISSUES
# ============================================================

if recent_cutoff is not None:

    topic_period_stats = (
        lf.group_by("topic")
        .agg(

            pl.col("_created_dt")
            .filter(
                pl.col("_created_dt")
                >= recent_cutoff
            )
            .len()
            .alias("recent_topic_volume"),

            pl.col("_created_dt")
            .filter(
                (
                    pl.col("_created_dt")
                    >= previous_cutoff
                )
                &
                (
                    pl.col("_created_dt")
                    < recent_cutoff
                )
            )
            .len()
            .alias("previous_topic_volume"),
        )
    )

else:

    topic_period_stats = (
        lf.select(
            pl.col("topic").unique()
        )
        .with_columns(
            pl.lit(0)
            .cast(pl.UInt32)
            .alias("recent_topic_volume"),

            pl.lit(0)
            .cast(pl.UInt32)
            .alias("previous_topic_volume"),
        )
    )


lf = lf.join(
    topic_period_stats,
    on="topic",
    how="left",
)

lf = lf.with_columns(
    pl.col("recent_topic_volume").fill_null(0),
    pl.col("previous_topic_volume").fill_null(0),
)


# ============================================================
# 27. EMERGING ISSUE FLAG
# ============================================================

lf = lf.with_columns(
    (
        (
            pl.col("recent_topic_volume") >= 5
        )
        &
        (
            pl.col("recent_topic_volume")
            >
            pl.col("previous_topic_volume")
        )
    )
    .cast(pl.Int8)
    .alias("emerging_issue")
)


# ============================================================
# 28. CONTEXT
# ============================================================

print_header("STEP 12 - CONTEXT GENERATION")

lf = lf.with_columns(

    (
        pl.lit("Customer complaint: ")
        + pl.col("clean_text")

        + pl.lit(". Category: ")
        + pl.col("complaint_category")

        + pl.lit(". Pain point: ")
        + pl.col("customer_pain_point")

        + pl.lit(". Sentiment: ")
        + pl.col("sentiment")

        + pl.lit(". Topic: ")
        + pl.col("topic")

        + pl.lit(". Escalation: ")
        + pl.col("escalation_flag").cast(pl.String)

        + pl.lit(". Resolution: ")
        + pl.col("resolution_flag").cast(pl.String)

        + pl.lit(". Recurring after solution: ")
        + pl.col(
            "recurring_issue_after_solution"
        ).cast(pl.String)

        + pl.lit(". Emerging issue: ")
        + pl.col("emerging_issue").cast(pl.String)
    )
    .alias("context")
)


# ============================================================
# 29. PROPAGATED GLOBAL METRICS
# ============================================================

print_header("STEP 13 - PROPAGATING BUSINESS METRICS")

lf = lf.with_columns(

    pl.lit(float(mean_response_time))
    .alias("mean_response_time"),

    pl.lit(float(global_resolution_rate * 100))
    .alias("avg_resolution_rate"),

    pl.lit(float(global_resolution_rate * 100))
    .alias("resolution_rate"),

    pl.lit(float(global_escalation_rate * 100))
    .alias("escalation_rate"),

    pl.lit(float(global_reopen_rate * 100))
    .alias("reopen_rate"),

    pl.lit(float(recurring_reduction_pct))
    .alias("recurring_issue_volume_reduction_pct"),

    pl.lit(float(improved_sentiment_trend))
    .alias("improved_sentiment_trend"),
)


# ============================================================
# 30. SERVICE QUALITY GAIN
# ============================================================

lf = lf.with_columns(

    (
        (
            pl.col("resolution_rate")
            / 100
            * 25
        )

        +

        (
            (
                1
                -
                pl.col("escalation_rate") / 100
            )
            * 25
        )

        +

        (
            pl.when(
                pl.col(
                    "improved_sentiment_trend"
                ) > 0
            )
            .then(
                pl.min_horizontal(
                    pl.col(
                        "improved_sentiment_trend"
                    ),
                    pl.lit(2.0),
                )
                / 2
                * 25
            )
            .otherwise(pl.lit(0.0))
        )

        +

        (
            pl.when(
                pl.col(
                    "recurring_issue_volume_reduction_pct"
                ) > 0
            )
            .then(
                pl.min_horizontal(
                    pl.col(
                        "recurring_issue_volume_reduction_pct"
                    ),
                    pl.lit(100.0),
                )
                / 100
                * 25
            )
            .otherwise(pl.lit(0.0))
        )
    )
    .alias("service_quality_gain")
)


# ============================================================
# 31. KPI SCORE
# ============================================================

print_header("STEP 14 - KPI SCORE")

lf = lf.with_columns(

    (

        # Resolution
        (
            pl.col("resolution_flag")
            * 30
        )

        +

        # Low escalation
        (
            (
                1
                -
                pl.col("escalation_flag")
            )
            * 20
        )

        +

        # Positive sentiment
        (
            (
                pl.col("sentiment")
                == pl.lit("positive")
            )
            .cast(pl.Int8)
            * 20
        )

        +

        # No reopen
        (
            (
                1
                -
                pl.col("reopened_after_solution")
            )
            * 20
        )

        +

        # Response speed
        (
            pl.when(
                pl.col(
                    "response_time_minutes"
                ).is_null()
            )
            .then(pl.lit(5))

            .when(
                pl.col(
                    "response_time_minutes"
                ) <= 30
            )
            .then(pl.lit(10))

            .when(
                pl.col(
                    "response_time_minutes"
                ) <= 120
            )
            .then(pl.lit(7))

            .otherwise(pl.lit(3))
        )
    )
    .alias("kpi_score")
)


# ============================================================
# 32. KPI STATUS
# ============================================================

lf = lf.with_columns(

    pl.when(
        pl.col("kpi_score") >= 80
    )
    .then(pl.lit("healthy"))

    .when(
        pl.col("kpi_score") >= 50
    )
    .then(pl.lit("attention"))

    .otherwise(
        pl.lit("critical")
    )

    .alias("kpi_status")
)


# ============================================================
# 33. DROP INTERNAL COLUMNS
# ============================================================

print_header("STEP 15 - FINAL COLUMN PREPARATION")

temporary_columns = [
    "_created_dt",
    "_response_lookup_id",
    "_response_id",
    "_response_time",
    "_sentiment_score",
    "_previous_sentiment",
    "_resolved_before",
    "customer_topic_frequency",
]

existing_columns = lf.collect_schema().names()

drop_columns = [
    c
    for c in temporary_columns
    if c in existing_columns
]

if drop_columns:
    lf = lf.drop(drop_columns)


# ============================================================
# 34. FINAL COLUMN ORDER
# ============================================================

priority_columns = [

    # Original identifiers
    "tweet_id",
    "author_id",
    "inbound",
    "created_at",
    "text",
    "response_tweet_id",
    "in_response_to_tweet_id",

    # Original analytical fields
    "sentiment",
    "topic_cluster",
    "topic",

    # Customer intelligence
    "clean_text",
    "complaint_category",
    "customer_pain_point",
    "pain_point_rank",
    "pain_point_volume",

    # Sentiment
    "sentiment_trajectory",
    "sentiment_change",

    # Response / resolution
    "response_time_minutes",
    "mean_response_time",
    "resolution_flag",
    "resolution_rate",
    "avg_resolution_rate",
    "escalation_flag",
    "escalation_rate",

    # Issue intelligence
    "new_issue",
    "recurring_issue",
    "recurring_issue_after_solution",
    "reopened_after_solution",
    "reopen_rate",

    # Emerging issues
    "emerging_issue",
    "recent_topic_volume",
    "previous_topic_volume",

    # Topic impact
    "topic_volume",
    "negative_sentiment_pct",
    "positive_sentiment_pct",
    "volume_sentiment_impact",

    # Time trend
    "recurring_issue_volume_reduction_pct",
    "improved_sentiment_trend",

    # KPI / quality
    "kpi_score",
    "kpi_status",
    "service_quality_gain",

    # RAG / LLM context
    "context",
]

all_columns = lf.collect_schema().names()

existing_priority = [
    c
    for c in priority_columns
    if c in all_columns
]

remaining_columns = [
    c
    for c in all_columns
    if c not in existing_priority
]

lf = lf.select(
    existing_priority + remaining_columns
)


# ============================================================
# 35. REMOVE OLD OUTPUT
# ============================================================

print_header("STEP 16 - PREPARING OUTPUT")

if OUTPUT_FILE.exists():

    print("Existing output found.")

    try:
        OUTPUT_FILE.unlink()

    except PermissionError:
        raise PermissionError(
            "\nThe output CSV is currently open.\n"
            "Close it in Excel / Power BI and run again."
        )


# ============================================================
# 36. STREAM DIRECTLY TO CSV
# ============================================================

print_header("STEP 17 - STREAMING OUTPUT CSV")

print("\nWriting:")
print(OUTPUT_FILE)

print("\nIMPORTANT:")
print(
    "The complete 3M+ row dataset is NOT collected into memory."
)
print(
    "Polars is streaming the transformed rows directly to CSV."
)

try:

    lf.sink_csv(
        str(OUTPUT_FILE),
        include_bom=True,
        maintain_order=True,
    )

except TypeError:

    # Compatibility with older Polars versions.
    lf.sink_csv(
        str(OUTPUT_FILE),
        include_bom=True,
    )


# ============================================================
# 37. OUTPUT VALIDATION
# ============================================================

print_header("STEP 18 - OUTPUT VALIDATION")

if not OUTPUT_FILE.exists():
    raise RuntimeError(
        "Output file was not created."
    )

output_size = OUTPUT_FILE.stat().st_size

if output_size == 0:
    raise RuntimeError(
        "Output CSV is empty."
    )

output_gb = (
    output_size
    / (1024 ** 3)
)

print(
    f"Output size: {output_gb:.2f} GB"
)


# ============================================================
# 38. FINAL SUMMARY
# ============================================================

elapsed = (
    time.perf_counter()
    - start_time
)

print_header("PIPELINE COMPLETED")

print(
    f"\nInput rows       : "
    f"{original_row_count:,}"
)

print(
    f"Output file      : "
    f"{OUTPUT_FILE}"
)

print(
    f"Output size      : "
    f"{output_gb:.2f} GB"
)

print(
    f"Processing time  : "
    f"{elapsed / 60:.2f} minutes"
)


print_header("BUSINESS METRICS")

print(
    "\nKPI calculation  : completed"
)

print(
    f"Resolution rate  : "
    f"{global_resolution_rate * 100:.2f}%"
)

print(
    f"Escalation rate  : "
    f"{global_escalation_rate * 100:.2f}%"
)

print(
    f"Reopen rate      : "
    f"{global_reopen_rate * 100:.2f}%"
)

print(
    f"Mean response    : "
    f"{mean_response_time:.2f} minutes"
)

print(
    f"Recurring change : "
    f"{recurring_reduction_pct:.2f}%"
)

print(
    f"Sentiment trend  : "
    f"{improved_sentiment_trend:.4f}"
)


print_header("FINAL DATASET METRICS")

print(
    """
The output dataset contains propagated metrics for every row:

1. KPI
2. Escalation rate
3. Average resolution rate
4. Context
5. Sentiment analysis
6. Resolution rate
7. Customer pain point
8. New issue
9. Recurring issue after solution
10. Emerging issue
11. Reopen rate
12. Sentiment trajectory
13. Pain-point ranking
14. Topic volume
15. Negative sentiment percentage
16. Positive sentiment percentage
17. Volume sentiment impact
18. Recurring-issue volume reduction over time
19. Improved sentiment trend
20. Mean response time
21. Service-quality gain
"""
)

print("\nDONE.")

# ============================================================
# END OF SCRIPT
# ============================================================