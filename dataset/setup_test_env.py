import os
import sys
import pandas as pd
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

# Add parent directory to sys.path so we can import from backend
sys.path.append(str(Path(__file__).resolve().parents[1]))

from backend.config.settings import settings
from backend.config.db import users_collection
from backend.auth.jwt import hash_password
from backend.algorithms.pipeline import DataIngestionPipeline

import boto3

class S3ProgressCallback:
    def __init__(self, filename):
        self._filename = filename
        self._size = os.path.getsize(filename)
        self._seen_so_far = 0

    def __call__(self, bytes_amount):
        self._seen_so_far += bytes_amount
        pct = min(100.0, (self._seen_so_far / self._size) * 100.0)
        sys.stdout.write(f"\r  [S3 Upload Progress {pct:5.1f}%] {self._seen_so_far:,} / {self._size:,} bytes")
        sys.stdout.flush()
        if self._seen_so_far >= self._size:
            print()

def upload_to_s3(file_path: str):
    """Uploads the raw dataset file directly to AWS S3 bucket voila-ai."""
    print("==========================================")
    print("STEP 0: UPLOADING RAW FILE TO AWS S3")
    print("==========================================")
    if not settings.aws_s3_bucket or not settings.aws_access_key_id:
        print("AWS credentials not configured. Skipping S3 upload.")
        return
        
    try:
        s3 = boto3.client(
            "s3",
            region_name=settings.aws_region or "ap-south-1",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
        file_name = Path(file_path).name
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        s3_key = f"uploads/{timestamp}_{file_name}"
        
        print(f"Uploading '{file_path}' to s3://{settings.aws_s3_bucket}/{s3_key}...")
        s3.upload_file(file_path, settings.aws_s3_bucket, s3_key, Callback=S3ProgressCallback(file_path))
        print(f"Successfully uploaded to S3! S3 URI: s3://{settings.aws_s3_bucket}/{s3_key}")
    except Exception as e:
        print(f"S3 Upload Warning: {e}")

def create_test_user():
    """Creates a default user 'deepak' with password 'deepak' in MongoDB if not exists."""
    print("==========================================")
    print("STEP 1: CREATING USER 'deepak'")
    print("==========================================")
    
    try:
        existing = users_collection.find_one({"username": "deepak"})
        if existing:
            print("User 'deepak' already exists in MongoDB.")
            return
            
        hashed = hash_password("deepak")
        user_doc = {
            "username": "deepak",
            "email": "deepak@voila.ai",
            "password_hash": hashed,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
        }
        users_collection.insert_one(user_doc)
        print("Successfully created user 'deepak' with password 'deepak'!")
    except Exception as e:
        print("\n[WARNING] Could not connect to MongoDB to create user 'deepak'.")
        print("Please ensure MongoDB is running locally on port 27017.")
        print(f"Details: {e}\n")

def push_to_snowflake_task(df: pd.DataFrame):
    """Uploads DataFrame to Snowflake in a parallel worker thread."""
    if df is None or not settings.snowflake_account or not settings.snowflake_user:
        return
        
    print("\n[PARALLEL THREAD] Starting Snowflake Upload...")
    try:
        import snowflake.connector
        from snowflake.connector.pandas_tools import write_pandas
        
        df_sf = df.copy()
        df_sf.columns = [col.upper() for col in df_sf.columns]
        
        conn = snowflake.connector.connect(
            user=settings.snowflake_user,
            password=settings.snowflake_password,
            account=settings.snowflake_account,
            warehouse=settings.snowflake_warehouse,
            database=settings.snowflake_database,
            schema=settings.snowflake_schema,
            role=settings.snowflake_role
        )
        
        success, nchunks, nrows, _ = write_pandas(
            conn=conn,
            df=df_sf,
            table_name="SOCIAL_MEDIA_METRICS",
            auto_create_table=True,
            use_logical_type=True
        )
        print(f"\n[PARALLEL THREAD SUCCESS] Uploaded {nrows:,} rows to Snowflake table 'SOCIAL_MEDIA_METRICS'!")
        conn.close()
    except Exception as e:
        print(f"\n[PARALLEL THREAD WARNING] Snowflake upload: {e}")

def run_ingestion_pipeline(file_path: str):
    """Runs the modular data analytics pipeline and pushes to MongoDB & Snowflake in low-latency parallel threads."""
    print("==========================================")
    print("STEP 2: RUNNING LOW-LATENCY ANALYTICS PIPELINE")
    print("==========================================")
    
    df = None
    try:
        pipeline = DataIngestionPipeline()
        df = pipeline.run(file_path)
    except Exception as e:
        print(f"\n[WARNING] Pipeline failed or skipped database insertion: {e}\n")
    
    if df is not None:
        print("\n==========================================")
        print("STEP 3: MULTI-THREADED DUAL DATABASE PERSISTENCE")
        print("==========================================")
        
        # Parallel execution of Snowflake upload while MongoDB handles cached aggregations
        with ThreadPoolExecutor(max_workers=2) as executor:
            sf_future = executor.submit(push_to_snowflake_task, df)
            sf_future.result()

if __name__ == "__main__":
    # Create sample.csv first if not exists
    sample_file = Path("sample.csv")
    if not sample_file.exists():
        from backend.algorithms.topic_clustering import TopicClusterer
        from backend.algorithms.text_cleaner import TextCleaner
        import numpy as np
        
        print("Generating a test sample.csv...")
        sample_data = [
            {"tweet_id": 101, "author_id": "cust_1", "inbound": True, "created_at": "2026-08-10T10:00:00Z", "text": "App keeps crashing after the new update!", "response_tweet_id": 102, "in_response_to_tweet_id": None, "priority": "high", "sentiment": "negative"},
            {"tweet_id": 102, "author_id": "agent_1", "inbound": False, "created_at": "2026-08-10T10:05:00Z", "text": "Sorry for this, please restart your app.", "response_tweet_id": None, "in_response_to_tweet_id": 101, "priority": "normal", "sentiment": "neutral"},
            {"tweet_id": 103, "author_id": "cust_2", "inbound": True, "created_at": "2026-08-10T11:00:00Z", "text": "Cannot login, reset password link fails.", "response_tweet_id": 104, "in_response_to_tweet_id": None, "priority": "high", "sentiment": "negative"},
            {"tweet_id": 104, "author_id": "agent_1", "inbound": False, "created_at": "2026-08-10T11:10:00Z", "text": "We have reset your password link, check email.", "response_tweet_id": None, "in_response_to_tweet_id": 103, "priority": "normal", "sentiment": "neutral"},
        ]
        pd.DataFrame(sample_data).to_csv("sample.csv", index=False)
        
    target_file = sys.argv[1] if len(sys.argv) > 1 else "sample.csv"
    
    create_test_user()
    run_ingestion_pipeline(target_file)
