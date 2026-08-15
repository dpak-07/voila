import os
import pandas as pd
import psycopg2
from dotenv import load_dotenv

load_dotenv("backend/.env")

# ============================================================
# 1. DATASET
# ============================================================

FILE = r"C:\Users\praveena\OneDrive\Documents\clean_training_largedata.csv.xlsm"


# ============================================================
# 2. POSTGRESQL CONFIGURATION
# ============================================================

DB_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "localhost"),
    "port": int(os.getenv("POSTGRES_PORT", "5432")),
    "database": os.getenv("POSTGRES_DB", "voila"),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD"),
}


# ============================================================
# 3. BATCH SIZE
# ============================================================

BATCH_SIZE = 5000


# ============================================================
# 4. LOAD DATASET
# ============================================================

print("Loading dataset...")

df = pd.read_excel(
    FILE,
    engine="openpyxl"
)

print(f"Total rows: {len(df):,}")


# ============================================================
# 5. CLEAN / CONVERT DATA TYPES
# ============================================================

print("Preparing data...")

# IDs are identifiers, so store them as TEXT
df["tweet_id"] = df["tweet_id"].astype(str)
df["author_id"] = df["author_id"].astype(str)
df["response_tweet_id"] = df["response_tweet_id"].astype(str)
df["in_response_to_tweet_id"] = (
    df["in_response_to_tweet_id"].astype(str)
)

# Boolean
df["inbound"] = df["inbound"].astype(bool)

# Date/time
df["created_at"] = pd.to_datetime(
    df["created_at"],
    errors="coerce"
)

# Text
df["text"] = df["text"].astype(str)

print("Data preparation complete.")


# ============================================================
# 6. CONNECT TO POSTGRESQL
# ============================================================

print("Connecting to PostgreSQL...")

conn = psycopg2.connect(
    **DB_CONFIG
)

cursor = conn.cursor()

print("Connected to PostgreSQL.")


# ============================================================
# 7. INSERT QUERY
# ============================================================

insert_sql = """
INSERT INTO customer_conversations
(
    tweet_id,
    author_id,
    inbound,
    created_at,
    text,
    response_tweet_id,
    in_response_to_tweet_id
)
VALUES (%s, %s, %s, %s, %s, %s, %s)
"""


# ============================================================
# 8. INSERT IN BATCHES
# ============================================================

total_rows = len(df)

for start in range(0, total_rows, BATCH_SIZE):

    chunk = df.iloc[start:start + BATCH_SIZE]

    records = [
        (
            row.tweet_id,
            row.author_id,
            row.inbound,
            row.created_at,
            row.text,
            row.response_tweet_id,
            row.in_response_to_tweet_id,
        )
        for row in chunk.itertuples(index=False)
    ]

    cursor.executemany(
        insert_sql,
        records
    )

    conn.commit()

    inserted = min(
        start + BATCH_SIZE,
        total_rows
    )

    print(
        f"Inserted {inserted:,} / {total_rows:,}"
    )


# ============================================================
# 9. CLOSE CONNECTION
# ============================================================

cursor.close()
conn.close()


# ============================================================
# 10. COMPLETE
# ============================================================

print("\n================================")
print("POSTGRES INGESTION COMPLETE")
print("================================")

print(
    f"Total records inserted: {total_rows:,}"
)