import os
import sys
import time
import uuid
import traceback

# Ensure repo root is on PYTHONPATH
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from backend.config.settings import settings
from backend.algorithms.db_connector import DBConnector
from backend.algorithms.pipeline import DataIngestionPipeline


def main():
    if len(sys.argv) < 2:
        print("Usage: run_smoke_snowflake.py <s3_key>")
        sys.exit(2)

    s3_key = sys.argv[1]
    run_id = str(uuid.uuid4())
    user = os.environ.get('USERNAME') or os.environ.get('USER') or 'smoke_test_user'

    print(f"[SMOKE TEST] Run ID: {run_id}")
    print(f"[SMOKE TEST] S3 Key: {s3_key}")
    print(f"[SMOKE TEST] User: {user}")

    db = DBConnector()

    try:
        print("[SMOKE TEST] Triggering Snowflake S3 COPY INTO (if configured)...")
        ok = db.trigger_snowflake_s3_copy(run_id=run_id, user_id=user, s3_file_key=s3_key, fallback_df=None)
        print(f"[SMOKE TEST] trigger_snowflake_s3_copy returned: {ok}")

        # Small delay to allow Snowflake to finish ingest if COPY INTO async; COPY INTO is executed synchronously here.
        time.sleep(2)

        print("[SMOKE TEST] Fetching staged rows from Snowflake for run_id...")
        df_sf = db.fetch_snowflake_dataframe(run_id)
        if df_sf is None:
            print("[SMOKE TEST] No Snowflake configured or fetch failed (df_sf is None). Exiting with failure.")
            sys.exit(3)

        try:
            nrows = len(df_sf)
        except Exception:
            nrows = 0
        print(f"[SMOKE TEST] Retrieved {nrows} rows from Snowflake for run {run_id}")

        if nrows == 0:
            print("[SMOKE TEST] No rows were loaded into Snowflake for that run_id. Please confirm the S3 key and Snowflake stage settings.")
            sys.exit(4)

        print("[SMOKE TEST] Running DataIngestionPipeline.run_dataframe on fetched Snowflake DataFrame (processing & KPI calc)...")
        pipeline = DataIngestionPipeline(run_id=run_id, user_id=user)
        pipeline.run_dataframe(df_sf, source_name=f"s3://{settings.aws_s3_bucket}/{s3_key}", file_size_mb=0.0, s3_file_key=s3_key)

        print("[SMOKE TEST] Pipeline run completed. Check dataset_kpis or KPI_PAYLOADS in Snowflake/Postgres.")
        sys.exit(0)

    except Exception as e:
        print("[SMOKE TEST] Exception during smoke test:")
        traceback.print_exc()
        sys.exit(5)


if __name__ == '__main__':
    main()
