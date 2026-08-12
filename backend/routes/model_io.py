from fastapi import APIRouter
from ..model_io import predict

router = APIRouter(prefix='/model', tags=['model_io'])

@router.post('/predict')
def model_predict(input_text: str):
    return predict({'text': input_text})
