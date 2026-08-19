# ============================================================
# FAST SENTIMENT CLASSIFICATION (MULTIPROCESSING OPTIMIZED)
# POSITIVE / NEGATIVE ONLY
#
# WHY THIS IS FASTER THAN THE ORIGINAL:
#
# Your log showed 2,743 rows/sec using ONE core out of 12.
# analyzer.polarity_scores() is pure Python / CPU-bound work
# with no GIL-releasing C extension underneath it, so a single
# process can only ever use one core no matter how the loop is
# written. The fix is process-level parallelism, not a faster
# loop.
#
# Changes:
# 1. A multiprocessing.Pool with N_WORKERS processes, each with
#    its OWN SentimentIntensityAnalyzer instance (created once
#    per worker via an initializer, not per call). The pool is
#    created ONCE outside the chunk loop and reused for every
#    chunk — spawning processes is relatively expensive, so we
#    pay that cost exactly once for the whole run.
# 2. Per-chunk exact-text deduplication: VADER only runs on the
#    UNIQUE texts in each chunk, then results are mapped back
#    to every row via a dict lookup. If your data has repeated
#    text (canned replies, retweets, "Thanks!" etc.), this cuts
#    real work substantially for free.
# 3. Larger chunk size (200k vs 100k) — fewer chunk-boundary
#    overheads, and gives the multiprocessing pool bigger,
#    more efficient batches to divide among workers.
#
# EXPECTED RESULT: something close to N_WORKERS-times speedup
# on the VADER step itself (not a perfect 12x — process
# spawning, pickling text back and forth, and CSV I/O all add
# overhead that doesn't parallelize). Treat this as "should get
# you into the 90-150s range for ~2.8-3M rows", not a guaranteed
# 60s — the exact number depends on how much duplicate text you
# have and your disk speed for the CSV write.
# ============================================================

import time
from pathlib import Path
from multiprocessing import Pool, cpu_count

import pandas as pd
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer


# ============================================================
# 1. CONFIGURATION
# ============================================================

INPUT_FILE = r"C:\Users\pooja\OneDrive\Desktop\CTS\clean_training_data.csv"

OUTPUT_FILE = (
    r"C:\Users\pooja\OneDrive\Desktop\CTS"
    r"\customer_sentiment_results.csv"
)

CHUNK_SIZE = 200_000

# Leave 1 core free for the OS / CSV writing thread. Bump this
# to cpu_count() if you want to test squeezing out the last
# bit of throughput (can make the machine feel sluggish while
# it runs).
N_WORKERS = max(1, cpu_count() - 1)

# Larger chunksize per worker call = less inter-process
# messaging overhead, but coarser load balancing between
# workers. This value works well for text-classification-sized
# workloads; leave as-is unless you're tuning specifically.
MP_CHUNKSIZE = 2000


# ============================================================
# 2. WORKER-SIDE STATE
#
# Each worker process gets its own analyzer, created once via
# the Pool initializer — NOT recreated on every call, and NOT
# shared/pickled across processes (SentimentIntensityAnalyzer
# doesn't need to be — each process just makes its own).
# ============================================================

_analyzer = None


def _init_worker():
    global _analyzer
    _analyzer = SentimentIntensityAnalyzer()


def _classify_one(text):
    if not text:
        return "negative"
    score = _analyzer.polarity_scores(text)["compound"]
    return "positive" if score >= 0 else "negative"


# ============================================================
# 3. MAIN PIPELINE
# ============================================================

def main():
    input_path = Path(INPUT_FILE)
    output_path = Path(OUTPUT_FILE)

    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found:\n{INPUT_FILE}")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("FAST SENTIMENT CLASSIFICATION (MULTIPROCESSING)")
    print("=" * 70)
    print(f"\nWorkers: {N_WORKERS} (of {cpu_count()} logical cores)")

    # --------------------------------------------------------
    # Find text column
    # --------------------------------------------------------

    sample = pd.read_csv(INPUT_FILE, nrows=5)

    if "clean_text" in sample.columns:
        TEXT_COLUMN = "clean_text"
    elif "text" in sample.columns:
        TEXT_COLUMN = "text"
    else:
        raise ValueError("Input CSV must contain either 'clean_text' or 'text'.")

    print(f"Text column selected: {TEXT_COLUMN}")

    if output_path.exists():
        output_path.unlink()
        print("Previous output removed.")

    print("\n" + "=" * 70)
    print("PROCESSING DATASET")
    print("=" * 70)

    start_time = time.time()
    processed_rows = 0
    chunk_number = 0
    first_chunk = True

    # Pool created ONCE, reused for every chunk. This is the
    # key structural change vs. spawning workers per chunk.
    with Pool(processes=N_WORKERS, initializer=_init_worker) as pool:

        for chunk in pd.read_csv(INPUT_FILE, chunksize=CHUNK_SIZE):

            chunk_number += 1
            chunk_start = time.time()

            texts = chunk[TEXT_COLUMN].fillna("").astype(str).str.strip()

            # -- dedup: only classify unique texts --
            unique_texts = texts.unique().tolist()

            results = pool.map(_classify_one, unique_texts, chunksize=MP_CHUNKSIZE)
            sentiment_lookup = dict(zip(unique_texts, results))

            chunk["sentiment"] = texts.map(sentiment_lookup)

            chunk.to_csv(
                OUTPUT_FILE,
                mode="w" if first_chunk else "a",
                header=first_chunk,
                index=False,
                encoding="utf-8-sig",
            )
            first_chunk = False

            processed_rows += len(chunk)
            chunk_time = time.time() - chunk_start
            total_time = time.time() - start_time
            speed = processed_rows / total_time if total_time > 0 else 0

            print(
                f"Chunk {chunk_number:03d} | "
                f"Rows: {processed_rows:,} | "
                f"Unique texts: {len(unique_texts):,} | "
                f"Chunk: {chunk_time:.2f}s | "
                f"Speed: {speed:,.0f} rows/sec"
            )

    total_time = time.time() - start_time

    print("\n" + "=" * 70)
    print("SENTIMENT CLASSIFICATION COMPLETED")
    print("=" * 70)
    print(f"Total rows processed : {processed_rows:,}")
    print(f"Total processing time: {total_time:.2f} seconds")
    if total_time > 0:
        print(f"Average speed        : {processed_rows / total_time:,.0f} rows/sec")
    print(f"Output file          : {OUTPUT_FILE}")
    print("\nSentiment classes:")
    print("  positive")
    print("  negative")
    print("=" * 70)


# ============================================================
# IMPORTANT: multiprocessing on Windows requires the entry
# point to be guarded like this, or it will re-import and
# re-execute the whole module in every worker process.
# ============================================================

if __name__ == "__main__":
    main()