from fastapi import APIRouter, Depends
from pathlib import Path

from ..auth.dependencies import get_current_user
from ..model_cleaning_pipeline import clean_records
from ..data_pipeline import process_database_file


router = APIRouter(
    prefix="/cleaning",
    tags=["model_cleaning_pipeline"]
)


DATA_FILE = (
    Path(__file__).resolve().parents[2]
    / "database"
    / "sample_data.json"
)


@router.get("/clean")
def clean_data(
    current_user: dict = Depends(get_current_user)
):
    records = process_database_file(str(DATA_FILE))
    cleaned = clean_records(records)

    return {
        "cleaned_records": cleaned,
        "count": len(cleaned)
    }