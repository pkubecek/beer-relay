import re
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..auth import require_admin
from ..models import (
    Event, EventCreate, EventRead, EventUpdate, EventStatus,
    Leg, LegCreate, LegRead,
)

router = APIRouter(prefix="/api/events", tags=["events"])


def slugify(text: str) -> str:
    s = text.strip().lower()
    replacements = str.maketrans("áčďéěíňóřšťúůýž", "acdeeinorstuuyz")
    s = s.translate(replacements)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "zavod"


# ---------- Public listing ----------

@router.get("", response_model=List[EventRead])
def list_events(session: Session = Depends(get_session)):
    events = session.exec(
        select(Event).where(Event.status != EventStatus.draft).order_by(Event.event_date.desc())
    ).all()
    return events


@router.get("/admin", response_model=List[EventRead], dependencies=[Depends(require_admin)])
def list_all_events_admin(session: Session = Depends(get_session)):
    events = session.exec(select(Event).order_by(Event.created_at.desc())).all()
    return events


@router.get("/{slug}", response_model=EventRead)
def get_event(slug: str, session: Session = Depends(get_session)):
    event = session.exec(select(Event).where(Event.slug == slug)).first()
    if not event or event.status == EventStatus.draft:
        raise HTTPException(status_code=404, detail="Závod nenalezen")
    return event


@router.get("/{slug}/admin", response_model=EventRead, dependencies=[Depends(require_admin)])
def get_event_admin(slug: str, session: Session = Depends(get_session)):
    event = session.exec(select(Event).where(Event.slug == slug)).first()
    if not event:
        raise HTTPException(status_code=404, detail="Závod nenalezen")
    return event


# ---------- Admin mutations ----------

@router.post("", response_model=EventRead, dependencies=[Depends(require_admin)])
def create_event(payload: EventCreate, session: Session = Depends(get_session)):
    data = payload.model_dump()
    if not data.get("slug"):
        data["slug"] = slugify(payload.name)
    else:
        data["slug"] = slugify(data["slug"])
    existing = session.exec(select(Event).where(Event.slug == data["slug"])).first()
    if existing:
        data["slug"] = f'{data["slug"]}-{__import__("uuid").uuid4().hex[:5]}'
    event = Event(**data)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


@router.patch("/{event_id}", response_model=EventRead, dependencies=[Depends(require_admin)])
def update_event(event_id: int, payload: EventUpdate, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Závod nenalezen")
    updates = payload.model_dump(exclude_unset=True)
    if "slug" in updates and updates["slug"]:
        updates["slug"] = slugify(updates["slug"])
    for k, v in updates.items():
        setattr(event, k, v)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_event(event_id: int, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Závod nenalezen")
    session.delete(event)
    session.commit()


# ---------- Legs ----------

@router.get("/{event_id}/legs", response_model=List[LegRead])
def list_legs(event_id: int, session: Session = Depends(get_session)):
    legs = session.exec(select(Leg).where(Leg.event_id == event_id).order_by(Leg.order)).all()
    return legs


@router.post("/{event_id}/legs", response_model=LegRead, dependencies=[Depends(require_admin)])
def create_leg(event_id: int, payload: LegCreate, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Závod nenalezen")
    leg = Leg(event_id=event_id, **payload.model_dump())
    session.add(leg)
    try:
        session.commit()
    except Exception:
        session.rollback()
        raise HTTPException(status_code=400, detail="Úsek s tímto pořadím už existuje")
    session.refresh(leg)
    return leg


@router.patch("/legs/{leg_id}", response_model=LegRead, dependencies=[Depends(require_admin)])
def update_leg(leg_id: int, payload: LegCreate, session: Session = Depends(get_session)):
    leg = session.get(Leg, leg_id)
    if not leg:
        raise HTTPException(status_code=404, detail="Úsek nenalezen")
    for k, v in payload.model_dump().items():
        setattr(leg, k, v)
    session.add(leg)
    session.commit()
    session.refresh(leg)
    return leg


@router.delete("/legs/{leg_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_leg(leg_id: int, session: Session = Depends(get_session)):
    leg = session.get(Leg, leg_id)
    if not leg:
        raise HTTPException(status_code=404, detail="Úsek nenalezen")
    session.delete(leg)
    session.commit()
