import re
import uuid
from datetime import date
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from ..auth import (
    can_manage_event,
    get_managed_event,
    get_optional_user,
    require_organizer,
)
from ..database import get_session
from ..models import (
    Category,
    CategoryCreate,
    CategoryRead,
    Event,
    EventCreate,
    EventRead,
    EventStatus,
    EventUpdate,
    Leg,
    LegCreate,
    LegRead,
    Team,
    TeamMember,
    User,
    UserRole,
)
from ..services import active_team_count, auto_close_expired, check_publishable, close_if_expired, event_to_read, local_now

router = APIRouter(prefix="/api/events", tags=["events"])


def slugify(text: str) -> str:
    s = text.strip().lower()
    replacements = str.maketrans("áäčďéěëíňóöřšťúůüýž", "aacdeeeinoorstuuuyz")
    s = s.translate(replacements)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "zavod"


def _unique_slug(session: Session, base: str, exclude_id: Optional[int] = None) -> str:
    slug = slugify(base)
    existing = session.exec(select(Event).where(Event.slug == slug)).first()
    if existing and existing.id != exclude_id:
        slug = f"{slug}-{uuid.uuid4().hex[:5]}"
    return slug


# =====================================================================
# Kalendář (veřejné)
# =====================================================================

@router.get("", response_model=List[EventRead])
def list_events(
    when: Literal["upcoming", "past", "all"] = "all",
    q: Optional[str] = None,
    year: Optional[int] = None,
    session: Session = Depends(get_session),
    user: Optional[User] = Depends(get_optional_user),
):
    auto_close_expired(session)
    stmt = select(Event).where(Event.status != EventStatus.draft)
    today = local_now().date()
    if when == "upcoming":
        stmt = stmt.where(or_(Event.event_date == None, Event.event_date >= today))  # noqa: E711
    elif when == "past":
        stmt = stmt.where(Event.event_date < today)
    if year:
        stmt = stmt.where(Event.event_date >= date(year, 1, 1), Event.event_date <= date(year, 12, 31))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Event.name.ilike(like), Event.location.ilike(like)))
    order = Event.event_date.asc() if when == "upcoming" else Event.event_date.desc()
    events = session.exec(stmt.order_by(order)).all()
    return [event_to_read(e, session, user) for e in events]


@router.get("/manage", response_model=List[EventRead])
def list_managed_events(session: Session = Depends(get_session), user: User = Depends(require_organizer)):
    auto_close_expired(session)
    stmt = select(Event)
    if user.role != UserRole.admin:
        stmt = stmt.where(Event.organizer_id == user.id)
    events = session.exec(stmt.order_by(Event.created_at.desc())).all()
    return [event_to_read(e, session, user) for e in events]


@router.get("/{slug}", response_model=EventRead)
def get_event(slug: str, session: Session = Depends(get_session), user: Optional[User] = Depends(get_optional_user)):
    event = session.exec(select(Event).where(Event.slug == slug)).first()
    if not event or (event.status == EventStatus.draft and not can_manage_event(user, event)):
        raise HTTPException(status_code=404, detail="Závod nenalezen")
    if close_if_expired(event):
        session.add(event)
        session.commit()
        session.refresh(event)
    return event_to_read(event, session, user)


# =====================================================================
# Správa závodu (pořadatel / admin)
# =====================================================================

@router.post("", response_model=EventRead, status_code=201)
def create_event(payload: EventCreate, session: Session = Depends(get_session), user: User = Depends(require_organizer)):
    data = payload.model_dump()
    data["slug"] = _unique_slug(session, data.get("slug") or payload.name)
    event = Event(**data, organizer_id=user.id)
    check_publishable(event)
    close_if_expired(event)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event_to_read(event, session, user)


@router.patch("/{event_id}", response_model=EventRead)
def update_event(
    event_id: int,
    payload: EventUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(require_organizer),
):
    event = get_managed_event(event_id, user, session)
    updates = payload.model_dump(exclude_unset=True)
    if "organizer_id" in updates:
        if user.role != UserRole.admin:
            raise HTTPException(status_code=403, detail="Pořadatele závodu může měnit jen admin")
        new_org = session.get(User, updates["organizer_id"]) if updates["organizer_id"] else None
        if updates["organizer_id"] and (not new_org or new_org.role == UserRole.user):
            raise HTTPException(status_code=400, detail="Vybraný uživatel není pořadatel")
    if updates.get("slug"):
        updates["slug"] = _unique_slug(session, updates["slug"], exclude_id=event.id)
    elif "slug" in updates:
        updates.pop("slug")
    if "name" in updates and not (updates["name"] or "").strip():
        raise HTTPException(status_code=422, detail="Název závodu nesmí být prázdný")
    if updates.get("count_in_ranking", True) is None:
        updates.pop("count_in_ranking")
    for k, v in updates.items():
        setattr(event, k, v)
    try:
        check_publishable(event)
    except HTTPException:
        session.rollback()
        raise
    close_if_expired(event)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event_to_read(event, session, user)


@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: int, session: Session = Depends(get_session), user: User = Depends(require_organizer)):
    event = get_managed_event(event_id, user, session)
    session.delete(event)
    session.commit()


# =====================================================================
# Úseky
# =====================================================================

@router.get("/{event_id}/legs", response_model=List[LegRead])
def list_legs(event_id: int, session: Session = Depends(get_session)):
    return session.exec(select(Leg).where(Leg.event_id == event_id).order_by(Leg.order)).all()


@router.post("/{event_id}/legs", response_model=LegRead, status_code=201)
def create_leg(event_id: int, payload: LegCreate, session: Session = Depends(get_session), user: User = Depends(require_organizer)):
    get_managed_event(event_id, user, session)
    leg = Leg(event_id=event_id, **payload.model_dump())
    session.add(leg)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=400, detail="Úsek s tímto pořadím už existuje")
    session.refresh(leg)
    return leg


@router.patch("/legs/{leg_id}", response_model=LegRead)
def update_leg(leg_id: int, payload: LegCreate, session: Session = Depends(get_session), user: User = Depends(require_organizer)):
    leg = session.get(Leg, leg_id)
    if not leg:
        raise HTTPException(status_code=404, detail="Úsek nenalezen")
    get_managed_event(leg.event_id, user, session)
    for k, v in payload.model_dump().items():
        setattr(leg, k, v)
    session.add(leg)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=400, detail="Úsek s tímto pořadím už existuje")
    session.refresh(leg)
    return leg


@router.delete("/legs/{leg_id}", status_code=204)
def delete_leg(leg_id: int, session: Session = Depends(get_session), user: User = Depends(require_organizer)):
    leg = session.get(Leg, leg_id)
    if not leg:
        raise HTTPException(status_code=404, detail="Úsek nenalezen")
    get_managed_event(leg.event_id, user, session)
    for m in session.exec(select(TeamMember).where(TeamMember.leg_id == leg_id)).all():
        m.leg_id = None
        session.add(m)
    session.delete(leg)
    session.commit()


# =====================================================================
# Kategorie
# =====================================================================

def _category_read(cat: Category, session: Session) -> CategoryRead:
    return CategoryRead(**cat.model_dump(), team_count=active_team_count(session, cat.event_id, cat.id))


@router.get("/{event_id}/categories", response_model=List[CategoryRead])
def list_categories(event_id: int, session: Session = Depends(get_session)):
    cats = session.exec(select(Category).where(Category.event_id == event_id).order_by(Category.order, Category.name)).all()
    return [_category_read(c, session) for c in cats]


@router.post("/{event_id}/categories", response_model=CategoryRead, status_code=201)
def create_category(
    event_id: int, payload: CategoryCreate, session: Session = Depends(get_session), user: User = Depends(require_organizer)
):
    get_managed_event(event_id, user, session)
    cat = Category(event_id=event_id, **payload.model_dump())
    session.add(cat)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=400, detail="Kategorie s tímto názvem už existuje")
    session.refresh(cat)
    return _category_read(cat, session)


@router.patch("/categories/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int, payload: CategoryCreate, session: Session = Depends(get_session), user: User = Depends(require_organizer)
):
    cat = session.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Kategorie nenalezena")
    get_managed_event(cat.event_id, user, session)
    for k, v in payload.model_dump().items():
        setattr(cat, k, v)
    session.add(cat)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=400, detail="Kategorie s tímto názvem už existuje")
    session.refresh(cat)
    return _category_read(cat, session)


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(category_id: int, session: Session = Depends(get_session), user: User = Depends(require_organizer)):
    cat = session.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Kategorie nenalezena")
    get_managed_event(cat.event_id, user, session)
    for t in session.exec(select(Team).where(Team.category_id == category_id)).all():
        t.category_id = None
        session.add(t)
    session.delete(cat)
    session.commit()
