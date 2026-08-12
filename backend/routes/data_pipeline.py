from fastapi import APIRouter
from pathlib import Path
from ..data_pipeline import process_database_file

router = APIRouter(prefix='/data', tags=['data_pipeline'])

DATA_FILE = Path(__file__).resolve().parents[2] / 'database' / 'sample_data.json'

@router.get('/load')
def load_data():
    records = process_database_file(str(DATA_FILE))
    return {'records': records, 'count': len(records)}
