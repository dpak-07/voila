from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

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
    password: str = Field(
        ...,
        min_length=6
    )

class LoginRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    identifier: Optional[str] = None
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    is_active: bool
    created_at: datetime