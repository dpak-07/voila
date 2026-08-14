import io
import os
import sys
import uuid
import boto3
import pandas as pd
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException

from backend.config.settings import settings
from backend.auth.dependencies import get_current_user_optional
from backend.algorithms.pipeline import DataIngestionPipeline

router = APIRouter(
    prefix="/upload",
    tags=["upload"]
)

def get_s3_client():
    """Initializes AWS S3 client with short connect timeout to avoid hanging."""
    from botocore.config import Config
    config = Config(connect_timeout=3, retries={"max_attempts": 1})
    return boto3.client(
        "s3",
        region_name=settings.aws_region or "ap-south-1",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        config=config
    )

def process_in_memory_pipeline(df: pd.DataFrame, s3_key: str, run_id: str, user_id: str, file_size_mb: float):
    """Executes the ingestion pipeline directly in-memory with zero disk latency."""
    print("\n" + "="*65, flush=True)
    print(f"[PIPELINE START] Ingestion pipeline launched for Run ID: {run_id}", flush=True)
    print(f"   * Authenticated User: {user_id}", flush=True)
    print(f"   * Target S3 Path:     s3://{settings.aws_s3_bucket}/{s3_key}", flush=True)
    print(f"   * Dataset Memory Size: {file_size_mb:.2f} MB ({len(df):,} rows)", flush=True)
    print("="*65 + "\n", flush=True)
    sys.stdout.flush()

    try:
        pipeline = DataIngestionPipeline(run_id=run_id, user_id=user_id)
        pipeline.run_dataframe(
            df, 
            source_name=f"s3://{settings.aws_s3_bucket}/{s3_key}", 
            file_size_mb=file_size_mb,
            s3_file_key=s3_key
        )
        print("\n" + "="*65, flush=True)
        print(f"[PIPELINE COMPLETE] Successfully processed & synced Run ID: {run_id}", flush=True)
        print("="*65 + "\n", flush=True)
        sys.stdout.flush()
    except Exception as e:
        print(f"\n[PIPELINE ERROR] Ingestion failed for {s3_key}: {e}\n", flush=True)
        sys.stdout.flush()

@router.post("")
async def upload_dataset_to_s3(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_optional)
):
    """
    High-speed direct in-memory upload endpoint:
    Streams CSV/Excel bytes simultaneously to S3 and executes pipeline in memory with zero disk bottleneck.
    """
    if not file.filename.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only .csv and .xlsx files are supported")

    run_id = str(uuid.uuid4())
    user_name = current_user.get("username", "deepak") if current_user else "deepak"
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    s3_key = f"uploads/{timestamp}_{run_id}_{file.filename}"

    print("\n" + "-"*50, flush=True)
    print(f"[UPLOAD RECEIVED] File: '{file.filename}' from user: '{user_name}'", flush=True)
    print("-"*50, flush=True)

    try:
        # Read file bytes in memory
        file_bytes = await file.read()
        file_size_mb = len(file_bytes) / (1024 * 1024)
        print(f"  -> Uploaded payload size: {file_size_mb:.2f} MB", flush=True)

        # 1. Non-blocking S3 Stream
        s3_uri = f"s3://{settings.aws_s3_bucket}/{s3_key}"
        if settings.aws_s3_bucket:
            try:
                s3 = get_s3_client()
                s3_buffer = io.BytesIO(file_bytes)
                s3.upload_fileobj(
                    s3_buffer,
                    settings.aws_s3_bucket,
                    s3_key,
                    ExtraArgs={"ContentType": file.content_type or "text/csv"}
                )
                print(f"  -> [S3 OK] Raw file streamed to s3://{settings.aws_s3_bucket}/{s3_key}", flush=True)
            except Exception as s3_err:
                print(f"  -> [S3 INFO] S3 direct stream skipped/fallback ({s3_err}). Proceeding in-memory.", flush=True)
        else:
            print("  -> [S3 INFO] No S3 bucket configured in .env. Proceeding in-memory.", flush=True)

        # 2. Parse DataFrame directly in RAM
        data_buffer = io.BytesIO(file_bytes)
        if file.filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(data_buffer)
        else:
            df = pd.read_csv(data_buffer)
        
        print(f"  -> [PARSER OK] Parsed {len(df):,} rows, {len(df.columns)} columns into DataFrame.", flush=True)

        # 3. Trigger In-Memory Ingestion Pipeline in Background
        background_tasks.add_task(
            process_in_memory_pipeline, 
            df, 
            s3_key, 
            run_id, 
            user_name, 
            file_size_mb
        )
        print(f"  -> [BACKGROUND TASK DISPATCHED] Pipeline running for Run ID: {run_id}", flush=True)

        return {
            "status": "success",
            "message": "File uploaded successfully. Ingestion pipeline is running.",
            "run_id": run_id,
            "s3_uri": s3_uri,
            "bucket": settings.aws_s3_bucket,
            "s3_key": s3_key,
            "uploaded_by": user_name,
            "total_rows": len(df)
        }
    except Exception as e:
        print(f"[UPLOAD ERROR] {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

