from fastapi import APIRouter, HTTPException, status

from ..models import AdminLogin, Token
from ..auth import verify_admin_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(payload: AdminLogin):
    if not verify_admin_password(payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Špatné heslo")
    return Token(access_token=create_access_token())
