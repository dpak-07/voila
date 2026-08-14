import sys
import subprocess
import boto3
from botocore.config import Config

# import settings from project
from backend.config.settings import settings

key = None
if len(sys.argv) >= 2:
    key = sys.argv[1]
else:
    print('Usage: check_s3_and_rerun.py <s3_key>')
    sys.exit(2)

bucket = settings.aws_s3_bucket
if not bucket:
    print('No AWS S3 bucket configured in settings.aws_s3_bucket')
    sys.exit(3)

print(f'Checking S3 bucket: {bucket} for key: {key}')

cfg = Config(connect_timeout=5, retries={'max_attempts': 1})
client = boto3.client('s3', region_name=settings.aws_region or 'us-east-1', aws_access_key_id=settings.aws_access_key_id, aws_secret_access_key=settings.aws_secret_access_key, config=cfg)
try:
    resp = client.head_object(Bucket=bucket, Key=key)
    print('S3 object exists; size:', resp.get('ContentLength'))
    print('Re-running smoke test...')
    proc = subprocess.run([sys.executable, 'backend/scripts/run_smoke_snowflake.py', key], check=False)
    print('Smoke test exit code:', proc.returncode)
    sys.exit(proc.returncode)
except client.exceptions.NoSuchKey:
    print('S3 object not found (NoSuchKey)')
    sys.exit(4)
except Exception as e:
    print('S3 check error:', e)
    sys.exit(5)
