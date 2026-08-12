from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

from .config.settings import settings
from .routes import (
    auth_router,
    data_pipeline_router,
    model_cleaning_router,
    model_io_router,
    rag_router,
)

app = FastAPI(title=settings.app_name)
app.include_router(auth_router)
app.include_router(data_pipeline_router)
app.include_router(model_cleaning_router)
app.include_router(model_io_router)
app.include_router(rag_router)

class Item(BaseModel):
    id: int
    title: str
    description: str

sample_items = [
    Item(id=1, title='Conversation summary', description='Sample insight from customer support chat.'),
    Item(id=2, title='Sentiment score', description='Positive sentiment detected in this example.'),
    Item(id=3, title='Topic tag', description='Support issue category: billing.'),
]

@app.get('/items', response_model=List[Item])
def read_items():
    return sample_items

@app.get('/')
def root():
    return {'message': 'Voila backend is running.'}
