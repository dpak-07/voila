import pandas as pd
import re
from pathlib import Path
import time


# ============================================================
# CONFIGURATION
# ============================================================

INPUT_FILE = r"D:\Downloads(d)\archive (18)\twcs\twcs.csv"

OUTPUT_FILE = r"C:\Users\pooja\OneDrive\Desktop\CTS\clean_training_data.csv"

CHUNK_SIZE = 100_000


# ============================================================
# REQUIRED COLUMNS
# ============================================================

REQUIRED_COLUMNS = [
    "tweet_id",
    "author_id",
    "inbound",
    "created_at",
    "text",
    "response_tweet_id",
    "in_response_to_tweet_id"
]


# ============================================================
# TEXT CLEANING
# ============================================================

# Compile regex only ONCE.
# This is much faster than creating regex repeatedly.

URL_PATTERN = re.compile(
    r"http\S+|www\S+",
    flags=re.IGNORECASE
)

MENTION_PATTERN = re.compile(
    r"@\w+"
)

RT_PATTERN = re.compile(
    r"\bRT\b",
    flags=re.IGNORECASE
)

HTML_PATTERN = re.compile(
    r"<.*?>"
)

HTML_ENTITY_PATTERN = re.compile(
    r"&(?:amp|lt|gt|quot|apos|nbsp);",
    flags=re.IGNORECASE
)

WHITESPACE_PATTERN = re.compile(
    r"\s+"
)


# Emoji ranges
EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F700-\U0001F77F"
    "\U0001F780-\U0001F7FF"
    "\U0001F800-\U0001F8FF"
    "\U0001F900-\U0001F9FF"
    "\U0001FA00-\U0001FAFF"
    "\U00002700-\U000027BF"
    "\U00002600-\U000026FF"
    "]+",
    flags=re.UNICODE
)


def clean_text_series(series):

    # Convert missing values to empty string
    series = series.fillna("").astype("string")

    # URLs
    series = series.str.replace(
        URL_PATTERN,
        " ",
        regex=True
    )

    # Mentions
    series = series.str.replace(
        MENTION_PATTERN,
        " ",
        regex=True
    )

    # RT
    series = series.str.replace(
        RT_PATTERN,
        " ",
        regex=True
    )

    # HTML
    series = series.str.replace(
        HTML_PATTERN,
        " ",
        regex=True
    )

    # HTML entities
    series = series.str.replace(
        HTML_ENTITY_PATTERN,
        " ",
        regex=True
    )

    # Emojis
    series = series.str.replace(
        EMOJI_PATTERN,
        " ",
        regex=True
    )

    # Keep normal ASCII characters
    series = (
        series
        .str.encode("ascii", errors="ignore")
        .str.decode("ascii")
    )

    # Normalize spaces
    series = series.str.replace(
        WHITESPACE_PATTERN,
        " ",
        regex=True
    )

    # Lowercase
    series = series.str.lower().str.strip()

    # Empty text
    series = series.mask(
        series == "",
        "no_text"
    )

    return series


# ============================================================
# START
# ============================================================

print("=" * 60)
print("LARGE DATASET CLEANING PIPELINE")
print("=" * 60)

print("\nInput:")
print(INPUT_FILE)

print("\nOutput:")
print(OUTPUT_FILE)

print("\nChunk size:", CHUNK_SIZE)


# ============================================================
# CHECK FILE
# ============================================================

if not Path(INPUT_FILE).exists():
    raise FileNotFoundError(
        f"Input file not found:\n{INPUT_FILE}"
    )


# ============================================================
# CHECK COLUMNS FIRST
# ============================================================

print("\nChecking dataset columns...")

sample = pd.read_csv(
    INPUT_FILE,
    nrows=5
)

missing_columns = [
    col
    for col in REQUIRED_COLUMNS
    if col not in sample.columns
]

if missing_columns:
    raise ValueError(
        f"Missing columns: {missing_columns}"
    )

print("All required columns available.")


# ============================================================
# REMOVE OLD OUTPUT
# ============================================================

output_path = Path(OUTPUT_FILE)

if output_path.exists():
    output_path.unlink()

print("\nStarting chunk processing...")


# ============================================================
# TRACKING
# ============================================================

total_rows = 0
total_output_rows = 0
total_duplicates = 0

start_time = time.time()


# ============================================================
# READ CSV IN CHUNKS
# ============================================================

reader = pd.read_csv(
    INPUT_FILE,

    usecols=REQUIRED_COLUMNS,

    chunksize=CHUNK_SIZE,

    low_memory=True,

    dtype={
        "tweet_id": "string",
        "author_id": "string",
        "inbound": "string",
        "text": "string",
        "response_tweet_id": "string",
        "in_response_to_tweet_id": "string"
    }
)


# ============================================================
# PROCESS EACH CHUNK
# ============================================================

for chunk_number, df in enumerate(reader, start=1):

    chunk_start = time.time()

    print(
        f"\nProcessing chunk {chunk_number}..."
    )

    # --------------------------------------------------------
    # COUNT INPUT
    # --------------------------------------------------------

    rows_before = len(df)

    total_rows += rows_before


    # --------------------------------------------------------
    # TWEET ID
    # --------------------------------------------------------

    df["tweet_id"] = pd.to_numeric(
        df["tweet_id"],
        errors="coerce"
    )

    # Tweet ID is mandatory
    df = df.dropna(
        subset=["tweet_id"]
    )

    df["tweet_id"] = (
        df["tweet_id"]
        .astype("int64")
    )


    # --------------------------------------------------------
    # AUTHOR ID
    # --------------------------------------------------------

    df["author_id"] = (
        df["author_id"]
        .fillna("UNKNOWN_AUTHOR")
        .astype("string")
        .str.strip()
    )

    df["author_id"] = df[
        "author_id"
    ].replace(
        {
            "": "UNKNOWN_AUTHOR",
            "nan": "UNKNOWN_AUTHOR",
            "none": "UNKNOWN_AUTHOR",
            "null": "UNKNOWN_AUTHOR"
        }
    )


    # --------------------------------------------------------
    # INBOUND
    # --------------------------------------------------------

    df["inbound"] = (
        df["inbound"]
        .fillna("")
        .str.strip()
        .str.lower()
    )

    df["inbound"] = df[
        "inbound"
    ].map(
        {
            "true": True,
            "false": False,
            "1": True,
            "0": False,
            "yes": True,
            "no": False
        }
    )

    df["inbound"] = (
        df["inbound"]
        .fillna(False)
        .astype(bool)
    )


    # --------------------------------------------------------
    # CREATED AT
    # --------------------------------------------------------

    df["created_at"] = pd.to_datetime(
        df["created_at"],
        errors="coerce"
    )

    # Do NOT use 1970 for missing dates.
    # Keep them as NaT because 1970 would create fake
    # timestamps and affect time-based analytics later.

    df["created_at"] = (
        df["created_at"]
        .dt.strftime("%Y-%m-%d %H:%M:%S")
    )

    df["created_at"] = (
        df["created_at"]
        .fillna("UNKNOWN_DATE")
    )


    # --------------------------------------------------------
    # TEXT
    # --------------------------------------------------------

    df["text"] = clean_text_series(
        df["text"]
    )


    # --------------------------------------------------------
    # RESPONSE TWEET ID
    # --------------------------------------------------------

    df["response_tweet_id"] = pd.to_numeric(
        df["response_tweet_id"],
        errors="coerce"
    )

    # Keep missing relationship as 0
    df["response_tweet_id"] = (
        df["response_tweet_id"]
        .fillna(0)
        .astype("int64")
    )


    # --------------------------------------------------------
    # IN RESPONSE TO TWEET ID
    # --------------------------------------------------------

    df["in_response_to_tweet_id"] = (
        pd.to_numeric(
            df["in_response_to_tweet_id"],
            errors="coerce"
        )
    )

    df["in_response_to_tweet_id"] = (
        df[
            "in_response_to_tweet_id"
        ]
        .fillna(0)
        .astype("int64")
    )


    # --------------------------------------------------------
    # REMOVE DUPLICATES INSIDE CURRENT CHUNK
    # --------------------------------------------------------

    before_duplicates = len(df)

    df = df.drop_duplicates(
        subset=["tweet_id"]
    )

    duplicates_removed = (
        before_duplicates - len(df)
    )

    total_duplicates += duplicates_removed


    # --------------------------------------------------------
    # WRITE CHUNK
    # --------------------------------------------------------

    df.to_csv(
        OUTPUT_FILE,
        mode="a",
        index=False,
        header=(
            chunk_number == 1
        )
    )


    # --------------------------------------------------------
    # UPDATE COUNTER
    # --------------------------------------------------------

    total_output_rows += len(df)


    elapsed = time.time() - start_time

    chunk_time = (
        time.time() - chunk_start
    )

    print(
        f"Input rows      : {rows_before:,}"
    )

    print(
        f"Output rows     : {len(df):,}"
    )

    print(
        f"Duplicates      : {duplicates_removed:,}"
    )

    print(
        f"Chunk time      : {chunk_time:.2f} sec"
    )

    print(
        f"Total processed : {total_rows:,}"
    )

    print(
        f"Total output    : {total_output_rows:,}"
    )

    print(
        f"Elapsed         : {elapsed / 60:.2f} min"
    )


# ============================================================
# FINAL SUMMARY
# ============================================================

total_time = (
    time.time() - start_time
)


print("\n")
print("=" * 60)
print("CLEANING COMPLETED")
print("=" * 60)

print(
    f"\nTotal input rows     : {total_rows:,}"
)

print(
    f"Total output rows    : {total_output_rows:,}"
)

print(
    f"Duplicates removed   : {total_duplicates:,}"
)

print(
    f"Total processing     : {total_time / 60:.2f} minutes"
)

print(
    "\nCleaned file:"
)

print(
    OUTPUT_FILE
)


# ============================================================
# FINAL VALIDATION
# ============================================================

print("\nValidating output...")

final_sample = pd.read_csv(
    OUTPUT_FILE,
    nrows=10
)

print(
    "\nOutput columns:"
)

print(
    final_sample.columns.tolist()
)

print(
    "\nSample cleaned data:"
)

print(
    final_sample.head()
)

print(
    "\nDone!"
)