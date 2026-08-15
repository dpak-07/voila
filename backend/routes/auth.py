from fastapi import APIRouter, Depends, HTTPException
from backend.auth.dependencies import get_current_user
from backend.models.user import UserCreate, LoginRequest
from backend.controllers.auth_service import (
    login_user,
    register_user,
    get_me,
    build_public_user,
)

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

@router.post("/login")
def login(payload: LoginRequest):
    try:
        ident = payload.identifier or payload.username or payload.email
        return login_user(ident, payload.password)
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
def me(current_user: dict = Depends(get_current_user)):
    user = get_me(current_user)
    if user is None:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return {
        "message": "Authentication successful",
        "user": build_public_user(user)
    }