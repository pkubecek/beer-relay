from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlmodel import Session, select

from ..auth import hash_password, require_admin
from ..database import get_session
from ..models import AdminUserUpdate, User, UserRead, UserRole

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=List[UserRead])
def list_users(
    q: Optional[str] = None,
    role: Optional[UserRole] = None,
    session: Session = Depends(get_session),
    _: User = Depends(require_admin),
):
    stmt = select(User)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(User.email.ilike(like), User.first_name.ilike(like), User.last_name.ilike(like), User.club.ilike(like)))
    if role:
        stmt = stmt.where(User.role == role)
    return session.exec(stmt.order_by(User.last_name, User.first_name)).all()


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    data = payload.model_dump(exclude_unset=True)
    if user.id == admin.id and (data.get("role") not in (None, UserRole.admin) or data.get("is_active") is False):
        raise HTTPException(status_code=400, detail="Sám sobě admina ani účet nevypínej")
    if "role" in data and data["role"] is not None:
        user.role = data["role"]
    if "is_active" in data and data["is_active"] is not None:
        user.is_active = data["is_active"]
    if data.get("new_password"):
        user.password_hash = hash_password(data["new_password"])
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
