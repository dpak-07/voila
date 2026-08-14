from fastapi import APIRouter, Depends
from backend.auth.dependencies import get_current_user_optional
from backend.model_io import predict

router = APIRouter(
    prefix="/model",
    tags=["model_io"]
)

@router.post("/predict")
def model_predict(
    input_text: str,
    current_user: dict = Depends(get_current_user_optional)
):
    return predict({
        "text": input_text
    })