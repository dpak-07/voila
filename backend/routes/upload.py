import io
import os
import sys
import uuid
import shutil
import tempfile
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

def process_streaming_csv_pipeline(file_path: str, s3_key: str, run_id: str, user_id: str, file_size_mb: float):
    """Executes memory-safe chunked ingestion for multi-million-row CSV uploads."""
    try:
        if settings.aws_s3_bucket and s3_key:
            try:
                s3 = get_s3_client()
                with open(file_path, "rb") as s3_buffer:
                    s3.upload_fileobj(s3_buffer, settings.aws_s3_bucket, s3_key, ExtraArgs={"ContentType": "text/csv"})
                print(f"  -> [S3 OK] Raw file uploaded to s3://{settings.aws_s3_bucket}/{s3_key}", flush=True)
            except Exception as s3_err:
                print(f"  -> [S3 INFO] S3 upload notice ({s3_err}). Continuing with PostgreSQL processing.", flush=True)

        pipeline = DataIngestionPipeline(run_id=run_id, user_id=user_id)
        pipeline.run_csv_streaming(
            file_path=file_path,
            source_name=f"s3://{settings.aws_s3_bucket}/{s3_key}" if settings.aws_s3_bucket else file_path,
            file_size_mb=file_size_mb,
            s3_file_key=s3_key if settings.aws_s3_bucket else None,
            chunk_size=100000,
        )
    except Exception as e:
        print(f"\n[STREAMING PIPELINE ERROR] Ingestion failed for {s3_key}: {e}\n", flush=True)
        sys.stdout.flush()
    finally:
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass

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
        suffix = os.path.splitext(file.filename)[1].lower()
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp_path = tmp.name
        try:
            shutil.copyfileobj(file.file, tmp)
        finally:
            tmp.close()

        file_size_mb = os.path.getsize(tmp_path) / (1024 * 1024)
        print(f"  -> Uploaded payload size: {file_size_mb:.2f} MB", flush=True)

        if suffix == ".csv" and file_size_mb >= float(os.getenv("VOILA_STREAM_UPLOAD_MB", "50")):
            background_tasks.add_task(
                process_streaming_csv_pipeline,
                tmp_path,
                s3_key,
                run_id,
                user_name,
                file_size_mb,
            )
            return {
                "status": "success",
                "message": "Large CSV uploaded successfully. Streaming ingestion is running in the background.",
                "run_id": run_id,
                "s3_uri": f"s3://{settings.aws_s3_bucket}/{s3_key}" if settings.aws_s3_bucket else None,
                "bucket": settings.aws_s3_bucket,
                "s3_key": s3_key,
                "uploaded_by": user_name,
                "total_rows": None,
                "processing_mode": "streaming"
            }

        # 1. Non-blocking Background S3 Upload
        s3_uri = f"s3://{settings.aws_s3_bucket}/{s3_key}" if settings.aws_s3_bucket else None
        if settings.aws_s3_bucket:
            import threading
            def _upload_to_s3_async(path_to_upload, bucket, key, ctype):
                try:
                    s3 = get_s3_client()
                    with open(path_to_upload, "rb") as s3_buffer:
                        s3.upload_fileobj(
                            s3_buffer,
                            bucket,
                            key,
                            ExtraArgs={"ContentType": ctype}
                        )
                    print(f"  -> [S3 OK] Raw file streamed asynchronously to s3://{bucket}/{key}", flush=True)
                except Exception as s3_err:
                    print(f"  -> [S3 INFO] S3 background stream notice ({s3_err}).", flush=True)

            threading.Thread(
                target=_upload_to_s3_async,
                args=(tmp_path, settings.aws_s3_bucket, s3_key, file.content_type or "text/csv"),
                daemon=True
            ).start()
        else:
            print("  -> [S3 INFO] No S3 bucket configured in .env. Proceeding in-memory.", flush=True)

        # 2. Parse entire DataFrame directly in RAM (Single-Pass Full Ingestion)
        if file.filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(tmp_path)
        else:
            df = pd.read_csv(tmp_path, low_memory=False)
        try:
            os.remove(tmp_path)
        except Exception:
            pass
        
        print(f"  -> [PARSER OK] Parsed {len(df):,} rows, {len(df.columns)} columns into memory.", flush=True)

        # 3. Trigger Full Ingestion Pipeline in One Single Shot
        background_tasks.add_task(
            process_in_memory_pipeline, 
            df, 
            s3_key, 
            run_id, 
            user_name, 
            file_size_mb
        )
        print(f"  -> [FULL INGESTION DISPATCHED] Single-pass pipeline running for all {len(df):,} records (Run ID: {run_id})", flush=True)

        return {
            "status": "success",
            "message": f"Dataset of {len(df):,} records uploaded successfully. Unified ingestion is running.",
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

