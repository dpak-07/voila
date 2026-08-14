from fastapi import APIRouter, Depends, HTTPException
from backend.auth.dependencies import get_current_user_optional
from backend.models.user import UserCreate
from backend.controllers.auth_service import login_user, register_user

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

@router.post("/login")
def login(username: str, password: str):
    try:
        return login_user(username, password)
    except ValueError as e:
        raise HTTPException(
            status_code=401,
            detail=str(e)
        )

@router.post("/register")
def register(user: UserCreate):
    try:
        return register_user(user)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user_optional)):
    return {
        "message": "Authentication successful",
        "user": current_user
    }