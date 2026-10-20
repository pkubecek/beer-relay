from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..auth import (
    apply_bootstrap_admin,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from ..database import get_session
from ..services import delete_account, new_racer_code
from ..models import (
    AccountDelete,
    OrganizerRequestIn,
    UserRole,
    AuthResponse,
    PasswordChange,
    TeamMember,
    User,
    UserLogin,
    UserRead,
    UserRegister,
    UserUpdate,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _auth_response(user: User) -> AuthResponse:
    return AuthResponse(access_token=create_access_token(user), user=UserRead.model_validate(user))


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: UserRegister, session: Session = Depends(get_session)):
    email = payload.email.lower().strip()
    if session.exec(select(User).where(User.email == email)).first():
        raise HTTPException(status_code=400, detail="Účet s tímto e-mailem už existuje")
    if not payload.first_name.strip() or not payload.last_name.strip():
        raise HTTPException(status_code=422, detail="Vyplň jméno i příjmení")

    data = payload.model_dump(exclude={"email", "password"})
    user = User(**data, email=email, password_hash=hash_password(payload.password), racer_code=new_racer_code(session))
    apply_bootstrap_admin(user)
    session.add(user)
    session.commit()
    session.refresh(user)

    # Propojit s týmy, kde už byl uveden jako člen pod tímto e-mailem.
    for member in session.exec(select(TeamMember).where(TeamMember.email == email, TeamMember.user_id == None)).all():  # noqa: E711
        member.user_id = user.id
        session.add(member)
    session.commit()

    return _auth_response(user)


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == payload.email.lower().strip())).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Špatný e-mail nebo heslo")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Účet je zablokovaný")
    if apply_bootstrap_admin(user):
        session.add(user)
        session.commit()
        session.refresh(user)
    return _auth_response(user)


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserRead)
def update_me(payload: UserUpdate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    for k, v in payload.model_dump(exclude_unset=True).items():
        if k == "hide_from_ranking" and v is None:
            continue
        if k in ("first_name", "last_name") and (v is None or not str(v).strip()):
            raise HTTPException(status_code=422, detail="Jméno a příjmení nesmí být prázdné")
        setattr(user, k, v)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/me/password", status_code=204)
def change_password(payload: PasswordChange, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Současné heslo nesedí")
    user.password_hash = hash_password(payload.new_password)
    session.add(user)
    session.commit()


@router.post("/me/organizer-request", response_model=UserRead)
def request_organizer(
    payload: OrganizerRequestIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    """Závodník požádá admina o možnost zakládat závody."""
    if user.role != UserRole.user:
        raise HTTPException(status_code=400, detail="Závody už zakládat můžeš")
    user.organizer_request_at = datetime.utcnow()
    user.organizer_request_note = (payload.note or "").strip() or None
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.delete("/me/organizer-request", response_model=UserRead)
def cancel_organizer_request(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    user.organizer_request_at = None
    user.organizer_request_note = None
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.delete("/me", status_code=204)
def delete_me(payload: AccountDelete, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Uživatel si smaže vlastní účet (potvrzuje heslem)."""
    if user.role == UserRole.admin:
        raise HTTPException(status_code=400, detail="Admin účet nejde smazat")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Heslo nesedí")
    delete_account(session, user)
