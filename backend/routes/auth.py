from fastapi import APIRouter, HTTPException

router = APIRouter(prefix='/auth', tags=['auth'])

@router.post('/login')
def login(username: str, password: str):
    if username == 'admin' and password == 'password':
        return {'access_token': 'dummy-token', 'token_type': 'bearer'}
    raise HTTPException(status_code=401, detail='Invalid credentials')
