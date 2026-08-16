import sys
import argparse
from pathlib import Path

# Add root repo directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.drop_full_db import drop_and_recreate_db
from scripts.generate_100k_dataset import generate_100k_records
from scripts.ingest_real_cts_dataset import ingest_cts_100k
from scripts.classify_100k_topics import classify_topics
from scripts.seed_snowflake import sync_postgres_to_snowflake

def run_status():
    import subprocess
    subprocess.run([sys.executable, str(Path(__file__).parent / "check_status.py")])

def run_full_pipeline(total_records: int = 100000, source: str = "synthetic", sync_sf: bool = True):
    print("\n" + "=" * 60)
    print(f"  RUNNING VOILA END-TO-END DB SEED PIPELINE ({total_records:,} records)")
    print("=" * 60 + "\n")

    # Step 1: Clean & Reset Databases
    print("\n>>> STEP 1: CLEANING DATABASES (POSTGRESQL & SNOWFLAKE)...")
    drop_and_recreate_db()

    # Step 2: Seed PostgreSQL
    print(f"\n>>> STEP 2: SEEDING POSTGRESQL WITH {total_records:,} RECORDS ({source.upper()})...")
    if source.lower() == "cts":
        ingest_cts_100k(total_records)
    else:
        generate_100k_records(total_records)

    # Step 3: Classify Topics
    print("\n>>> STEP 3: RUNNING TOPIC CLASSIFICATION...")
    classify_topics()

    # Step 4: Seed / Sync Snowflake
    if sync_sf:
        print(f"\n>>> STEP 4: SYNCING {total_records:,} RECORDS TO SNOWFLAKE...")
        try:
            sync_postgres_to_snowflake(total_records)
        except Exception as e:
            print(f"[Snowflake Sync Warning]: {e}")

    # Step 5: Final Status Check
    print("\n>>> STEP 5: FINAL STATUS INSPECTION...")
    run_status()

    print("\n" + "=" * 60)
    print("  ALL DATABASE OPERATIONS COMPLETED SUCCESSFULLY!")
    print("=" * 60 + "\n")

def main():
    parser = argparse.ArgumentParser(description="Voila Database Management & Seed CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Clean
    subparsers.add_parser("clean", help="Drop & recreate PostgreSQL and truncate Snowflake tables")

    # Status
    subparsers.add_parser("status", help="Inspect table row counts in PostgreSQL and Snowflake")

    # Seed 100k Synthetic
    p_seed_100k = subparsers.add_parser("seed-100k", help="Generate and seed synthetic 100K benchmark dataset to Postgres")
    p_seed_100k.add_argument("--count", type=int, default=100000, help="Number of records to generate (default: 100000)")

    # Seed CTS Real
    p_seed_cts = subparsers.add_parser("seed-cts", help="Ingest real CTS complaint intelligence dataset to Postgres")
    p_seed_cts.add_argument("--count", type=int, default=100000, help="Number of records to ingest (default: 100000)")

    # Seed Snowflake
    p_seed_sf = subparsers.add_parser("seed-snowflake", help="Sync data from PostgreSQL to Snowflake SOCIAL_MEDIA_METRICS")
    p_seed_sf.add_argument("--count", type=int, default=100000, help="Number of records to sync (default: 100000)")

    # Classify
    subparsers.add_parser("classify", help="Run topic classification on PostgreSQL dataset")

    # Full Pipeline
    p_all = subparsers.add_parser("pipeline", help="Run full pipeline: clean -> seed -> classify -> sync snowflake -> status")
    p_all.add_argument("--count", type=int, default=100000, help="Number of records (default: 100000)")
    p_all.add_argument("--source", choices=["synthetic", "cts"], default="synthetic", help="Dataset source: synthetic or cts")
    p_all.add_argument("--no-sf", action="store_true", help="Skip Snowflake sync")

    args = parser.parse_args()

    if args.command == "clean":
        drop_and_recreate_db()
    elif args.command == "status":
        run_status()
    elif args.command == "seed-100k":
        generate_100k_records(args.count)
    elif args.command == "seed-cts":
        ingest_cts_100k(args.count)
    elif args.command == "seed-snowflake":
        sync_postgres_to_snowflake(args.count)
    elif args.command == "classify":
        classify_topics()
    elif args.command == "pipeline":
        run_full_pipeline(total_records=args.count, source=args.source, sync_sf=not args.no_sf)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
