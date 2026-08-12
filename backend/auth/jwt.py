from typing import Optional

# Placeholder auth functions; replace with real JWT or OAuth logic.

def authenticate_user(username: str, password: str) -> Optional[dict]:
    if username == 'admin' and password == 'password':
        return {'username': username, 'role': 'admin'}
    return None
