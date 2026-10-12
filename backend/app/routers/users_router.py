from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlmodel import Session, select

from ..auth import hash_password, require_admin
from ..database import get_session
from ..models import AdminUserRead, AdminUserUpdate, Event, Team, TeamMember, User, UserRole

router = APIRouter(prefix="/api/users", tags=["users"])

PROFILE_FIELDS = ("first_name", "last_name", "birth_year", "club", "phone")


def _to_read(session: Session, user: User) -> AdminUserRead:
    events = session.exec(select(func.count(Event.id)).where(Event.organizer_id == user.id)).one()
    entries = session.exec(select(func.count(Team.id)).where(Team.captain_id == user.id)).one()
    return AdminUserRead(**user.model_dump(exclude={"password_hash"}), events_count=events, entries_count=entries)


def _get_user(session: Session, user_id: int) -> User:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    return user


@router.get("", response_model=List[AdminUserRead])
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
    users = session.exec(stmt.order_by(User.last_name, User.first_name)).all()
    return [_to_read(session, u) for u in users]


@router.patch("/{user_id}", response_model=AdminUserRead)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin),
):
    user = _get_user(session, user_id)
    data = payload.model_dump(exclude_unset=True)

    if "role" in data and data["role"] is not None:
        if data["role"] == UserRole.admin:
            raise HTTPException(status_code=400, detail="Roli admin nejde přidělit – nastavuje se přes ADMIN_EMAILS")
        if user.role == UserRole.admin:
            raise HTTPException(status_code=400, detail="Admin účtu nejde měnit roli")
        user.role = data["role"]
    if "is_active" in data and data["is_active"] is not None:
        if user.role == UserRole.admin or user.id == admin.id:
            raise HTTPException(status_code=400, detail="Admin účet nejde zablokovat")
        user.is_active = data["is_active"]
    if data.get("new_password"):
        user.password_hash = hash_password(data["new_password"])
    if data.get("email"):
        email = data["email"].lower().strip()
        other = session.exec(select(User).where(User.email == email)).first()
        if other and other.id != user.id:
            raise HTTPException(status_code=400, detail="Tento e-mail už má jiný účet")
        user.email = email
    for k in PROFILE_FIELDS:
        if k in data:
            if k in ("first_name", "last_name") and not (data[k] or "").strip():
                raise HTTPException(status_code=422, detail="Jméno a příjmení nesmí být prázdné")
            setattr(user, k, data[k])

    session.add(user)
    session.commit()
    session.refresh(user)
    return _to_read(session, user)


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, session: Session = Depends(get_session), admin: User = Depends(require_admin)):
    """Smaže účet. Jeho týmy a závody zůstanou (jen bez vazby na účet)."""
    user = _get_user(session, user_id)
    if user.role == UserRole.admin or user.id == admin.id:
        raise HTTPException(status_code=400, detail="Admin účet nejde smazat")
    for ev in session.exec(select(Event).where(Event.organizer_id == user.id)).all():
        ev.organizer_id = None
        session.add(ev)
    for t in session.exec(select(Team).where(Team.captain_id == user.id)).all():
        t.captain_id = None
        session.add(t)
    for m in session.exec(select(TeamMember).where(TeamMember.user_id == user.id)).all():
        m.user_id = None
        session.add(m)
    session.delete(user)
    session.commit()
