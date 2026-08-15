from datetime import datetime
from pydantic import BaseModel, Field

from typing import Optional

class UserCreate(BaseModel):
    username: str = Field(
        ...,
        min_length=3,
        max_length=50
    )
    email: str = Field(
        ...,
        min_length=5,
        max_length=100
    )
    full_name: Optional[str] = None
    password: str = Field(
        ...,
        min_length=6
    )

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    is_active: bool
    created_at: datetime