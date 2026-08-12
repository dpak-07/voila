from fastapi import APIRouter
from ..model_cleaning_pipeline import clean_records
from pathlib import Path
from ..data_pipeline import process_database_file

router = APIRouter(prefix='/cleaning', tags=['model_cleaning_pipeline'])

DATA_FILE = Path(__file__).resolve().parents[2] / 'database' / 'sample_data.json'

@router.get('/clean')
def clean_data():
    records = process_database_file(str(DATA_FILE))
    cleaned = clean_records(records)
    return {'cleaned_records': cleaned, 'count': len(cleaned)}
