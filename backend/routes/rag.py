from fastapi import APIRouter
from ..rag import rag_response
from pathlib import Path
from ..data_pipeline import process_database_file

router = APIRouter(prefix='/rag', tags=['rag'])

DATA_FILE = Path(__file__).resolve().parents[2] / 'database' / 'sample_data.json'

@router.get('/query')
async def rag_query(q: str):
    documents = process_database_file(str(DATA_FILE))
    result = await rag_response(q, documents)
    return result
