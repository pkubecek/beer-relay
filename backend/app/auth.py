import calendar
import os
import warnings
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlmodel import Session

from .database import get_session
from .models import User, UserRole, ROLE_LEVEL, Event

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production-please")
if SECRET_KEY.startswith("change-me"):
    warnings.warn("SECRET_KEY není nastavený – v produkci ho nastav na náhodný dlouhý řetězec!")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "14"))

# E-maily, které po registraci/přihlášení automaticky dostanou roli admin.
ADMIN_EMAILS = {e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()}

bearer_scheme = HTTPBearer(auto_error=False)


# ---------- hesla ----------

def _pw_bytes(password: str) -> bytes:
    # bcrypt bere max. 72 bajtů
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_pw_bytes(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(_pw_bytes(password), password_hash.encode("utf-8"))
    except ValueError:
        return False


# ---------- tokeny ----------

def _ts(dt: datetime) -> int:
    """Naivní UTC datetime -> unix timestamp (celé sekundy)."""
    return calendar.timegm(dt.utctimetuple())


def mark_password_changed(user: User) -> None:
    """Zneplatní všechny dříve vydané tokeny uživatele (volá se při změně hesla)."""
    user.password_changed_at = datetime.utcnow().replace(microsecond=0)


def create_access_token(user: User) -> str:
    now = datetime.utcnow()
    expire = now + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": str(user.id), "iat": _ts(now), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def _user_from_token(token: str, session: Session) -> Optional[User]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        issued_at = int(payload.get("iat") or 0)
    except (JWTError, TypeError, ValueError):
        return None
    user = session.get(User, user_id)
    if not user or not user.is_active:
        return None
    # token vydaný před poslední změnou hesla už neplatí
    if user.password_changed_at and issued_at < _ts(user.password_changed_at):
        return None
    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> Optional[User]:
    if credentials is None:
        return None
    return _user_from_token(credentials.credentials, session)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Chybí přihlášení")
    user = _user_from_token(credentials.credentials, session)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Neplatné nebo expirované přihlášení")
    return user


def has_role(user: Optional[User], role: UserRole) -> bool:
    return user is not None and ROLE_LEVEL[user.role] >= ROLE_LEVEL[role]


def require_role(role: UserRole):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if not has_role(user, role):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Na tuto akci nemáš oprávnění")
        return user

    return dependency


require_organizer = require_role(UserRole.organizer)
require_admin = require_role(UserRole.admin)


def can_manage_event(user: Optional[User], event: Event) -> bool:
    if user is None:
        return False
    if user.role == UserRole.admin:
        return True
    return user.role == UserRole.organizer and event.organizer_id == user.id


def get_managed_event(event_id: int, user: User, session: Session) -> Event:
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Závod nenalezen")
    if not can_manage_event(user, event):
        raise HTTPException(status_code=403, detail="Tento závod nespravuješ")
    return event


def apply_bootstrap_admin(user: User) -> bool:
    """Povýší uživatele na admina, pokud je jeho e-mail v ADMIN_EMAILS. Vrací True při změně."""
    if user.email.lower() in ADMIN_EMAILS and user.role != UserRole.admin:
        user.role = UserRole.admin
        return True
    return False
