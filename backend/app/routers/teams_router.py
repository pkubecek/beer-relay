import csv
import io
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from ..auth import can_manage_event, get_current_user, get_managed_event, require_organizer
from ..database import get_session
from ..models import (
    Category,
    Event,
    EventStatus,
    Leg,
    MyEntryRead,
    StartNumbersRequest,
    Team,
    TeamAdminUpdate,
    TeamEntryIn,
    TeamMember,
    TeamMemberIn,
    TeamPublic,
    TeamRead,
    TeamStatus,
    User,
)
from ..services import (
    TEAM_STATUS_CZ,
    active_team_count,
    category_belongs,
    local_now,
    registration_state,
    team_to_public,
    team_to_read,
)

router = APIRouter(prefix="/api", tags=["entries"])


# =====================================================================
# Pomocné funkce
# =====================================================================

def _get_event(session: Session, event_id: int) -> Event:
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Závod nenalezen")
    return event


def _get_team(session: Session, team_id: int) -> Team:
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Přihláška nenalezena")
    return team


def captain_can_edit(event: Event) -> bool:
    """Kapitán smí přihlášku měnit/rušit, dokud jsou přihlášky otevřené a neproběhla uzávěrka."""
    if event.status != EventStatus.open:
        return False
    return not (event.entry_deadline and local_now() > event.entry_deadline)


def _check_category(session: Session, event: Event, category_id: Optional[int], team_id: Optional[int] = None) -> Optional[Category]:
    has_categories = session.exec(select(Category.id).where(Category.event_id == event.id)).first() is not None
    if category_id is None:
        if has_categories:
            raise HTTPException(status_code=422, detail="Vyber kategorii")
        return None
    cat = category_belongs(session, category_id, event.id)
    if not cat:
        raise HTTPException(status_code=422, detail="Neplatná kategorie")
    if cat.max_teams is not None:
        count = active_team_count(session, event.id, cat.id)
        if team_id is not None:
            current = session.get(Team, team_id)
            if current and current.category_id == cat.id and current.status != TeamStatus.rejected:
                count -= 1
        if count >= cat.max_teams:
            raise HTTPException(status_code=400, detail=f"Kategorie {cat.name} je plná")
    return cat


def _replace_members(session: Session, team: Team, members: List[TeamMemberIn]) -> None:
    legs = {leg.id for leg in session.exec(select(Leg).where(Leg.event_id == team.event_id)).all()}
    seen_legs = set()
    cleaned = []
    for m in members:
        name = (m.name or "").strip()
        if not name:
            continue
        if m.leg_id is not None:
            if m.leg_id not in legs:
                raise HTTPException(status_code=422, detail="Úsek nepatří k tomuto závodu")
            if m.leg_id in seen_legs:
                raise HTTPException(status_code=422, detail="Na každý úsek může být zapsaný jen jeden člen")
            seen_legs.add(m.leg_id)
        cleaned.append((m.leg_id, name, (m.email or "").strip().lower() or None))

    team.member_rows.clear()  # delete-orphan smaže staré řádky
    session.flush()

    for leg_id, name, email in cleaned:
        user_id = None
        if email:
            linked = session.exec(select(User).where(User.email == email)).first()
            user_id = linked.id if linked else None
        session.add(TeamMember(team_id=team.id, leg_id=leg_id, name=name, email=email, user_id=user_id))


def _commit_team(session: Session) -> None:
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=400, detail="Tým s tímto názvem je už v tomto závodě přihlášený")


def _check_team_name(session: Session, event_id: int, name: str, team_id: Optional[int] = None) -> None:
    existing = session.exec(select(Team).where(Team.event_id == event_id, Team.name == name)).first()
    if existing and existing.id != team_id:
        raise HTTPException(status_code=400, detail="Tým s tímto názvem je už v tomto závodě přihlášený")


# =====================================================================
# Veřejný seznam přihlášených
# =====================================================================

@router.get("/events/{event_id}/entries", response_model=List[TeamPublic])
def list_entries_public(event_id: int, session: Session = Depends(get_session)):
    event = _get_event(session, event_id)
    if event.status == EventStatus.draft:
        raise HTTPException(status_code=404, detail="Závod nenalezen")
    teams = session.exec(
        select(Team).where(Team.event_id == event_id, Team.status != TeamStatus.rejected).order_by(Team.created_at)
    ).all()
    return [team_to_public(t) for t in teams]


# =====================================================================
# Přihláška týmu (přihlášený uživatel = kapitán)
# =====================================================================

@router.post("/events/{event_id}/entries", response_model=TeamRead, status_code=201)
def create_entry(
    event_id: int,
    payload: TeamEntryIn,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    event = _get_event(session, event_id)
    is_manager = can_manage_event(user, event)
    open_, message = registration_state(event, session)
    if not open_ and not is_manager:
        raise HTTPException(status_code=400, detail=message or "Přihlášky nejsou otevřené")

    name = payload.name.strip()
    _check_team_name(session, event.id, name)
    _check_category(session, event, payload.category_id)

    team = Team(
        event_id=event.id,
        name=name,
        club=(payload.club or user.club or None),
        category_id=payload.category_id,
        captain_id=user.id,
        contact_name=user.full_name,
        contact_email=user.email,
        contact_phone=payload.contact_phone or user.phone,
        note=payload.note,
        status=TeamStatus.pending if event.require_approval else TeamStatus.approved,
    )
    session.add(team)
    try:
        session.flush()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=400, detail="Tým s tímto názvem je už v tomto závodě přihlášený")
    _replace_members(session, team, payload.members)
    _commit_team(session)
    session.refresh(team)
    return team_to_read(team)


@router.get("/me/entries", response_model=List[MyEntryRead])
def my_entries(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    member_team_ids = select(TeamMember.team_id).where(TeamMember.user_id == user.id)
    teams = session.exec(
        select(Team).where(or_(Team.captain_id == user.id, Team.id.in_(member_team_ids)))
    ).all()
    out = []
    for team in teams:
        event = session.get(Event, team.event_id)
        cat = session.get(Category, team.category_id) if team.category_id else None
        is_captain = team.captain_id == user.id
        base = team_to_read(team).model_dump()
        out.append(
            MyEntryRead(
                **base,
                event_name=event.name,
                event_slug=event.slug,
                event_date=event.event_date,
                category_name=cat.name if cat else None,
                is_captain=is_captain,
                can_edit=(is_captain and captain_can_edit(event)) or can_manage_event(user, event),
            )
        )
    out.sort(key=lambda e: (e.event_date is None, e.event_date), reverse=True)
    return out


def _require_entry_access(team: Team, event: Event, user: User, edit: bool) -> None:
    if can_manage_event(user, event):
        return
    if team.captain_id == user.id:
        if edit and not captain_can_edit(event):
            raise HTTPException(status_code=400, detail="Po uzávěrce už přihlášku měnit nejde – kontaktuj pořadatele")
        return
    if not edit:
        member_ids = {m.user_id for m in team.member_rows}
        if user.id in member_ids:
            return
    raise HTTPException(status_code=403, detail="K této přihlášce nemáš přístup")


@router.get("/entries/{team_id}", response_model=TeamRead)
def get_entry(team_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    team = _get_team(session, team_id)
    event = _get_event(session, team.event_id)
    _require_entry_access(team, event, user, edit=False)
    return team_to_read(team)


@router.put("/entries/{team_id}", response_model=TeamRead)
def update_entry(
    team_id: int,
    payload: TeamEntryIn,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    team = _get_team(session, team_id)
    event = _get_event(session, team.event_id)
    _require_entry_access(team, event, user, edit=True)

    name = payload.name.strip()
    _check_team_name(session, event.id, name, team_id=team.id)
    if payload.category_id != team.category_id:
        _check_category(session, event, payload.category_id, team_id=team.id)

    team.name = name
    team.club = payload.club
    team.category_id = payload.category_id
    team.contact_phone = payload.contact_phone
    team.note = payload.note
    team.updated_at = datetime.utcnow()
    session.add(team)
    _replace_members(session, team, payload.members)
    _commit_team(session)
    session.refresh(team)
    return team_to_read(team)


@router.delete("/entries/{team_id}", status_code=204)
def delete_entry(team_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    team = _get_team(session, team_id)
    event = _get_event(session, team.event_id)
    _require_entry_access(team, event, user, edit=True)
    session.delete(team)
    session.commit()


# =====================================================================
# Správa přihlášek pořadatelem
# =====================================================================

@router.get("/events/{event_id}/entries/manage", response_model=List[TeamRead])
def list_entries_manage(event_id: int, session: Session = Depends(get_session), user: User = Depends(require_organizer)):
    get_managed_event(event_id, user, session)
    teams = session.exec(select(Team).where(Team.event_id == event_id).order_by(Team.created_at)).all()
    return [team_to_read(t) for t in teams]


@router.patch("/entries/{team_id}/manage", response_model=TeamRead)
def manage_entry(
    team_id: int,
    payload: TeamAdminUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(require_organizer),
):
    team = _get_team(session, team_id)
    event = get_managed_event(team.event_id, user, session)
    data = payload.model_dump(exclude_unset=True)
    if "category_id" in data and data["category_id"] is not None and not category_belongs(session, data["category_id"], event.id):
        raise HTTPException(status_code=422, detail="Neplatná kategorie")
    for k, v in data.items():
        setattr(team, k, v)
    team.updated_at = datetime.utcnow()
    session.add(team)
    session.commit()
    session.refresh(team)
    return team_to_read(team)


@router.post("/events/{event_id}/start-numbers", response_model=List[TeamRead])
def assign_start_numbers(
    event_id: int,
    payload: StartNumbersRequest,
    session: Session = Depends(get_session),
    user: User = Depends(require_organizer),
):
    """Přidělí startovní čísla postupně – po kategoriích (dle pořadí kategorie), uvnitř podle data přihlášky."""
    get_managed_event(event_id, user, session)
    cat_order = {c.id: (c.order, c.name) for c in session.exec(select(Category).where(Category.event_id == event_id)).all()}
    stmt = select(Team).where(Team.event_id == event_id)
    stmt = stmt.where(Team.status == TeamStatus.approved) if payload.only_approved else stmt.where(Team.status != TeamStatus.rejected)
    teams = session.exec(stmt).all()
    teams.sort(key=lambda t: (cat_order.get(t.category_id, (10_000, "")), t.created_at))
    for i, team in enumerate(teams):
        team.start_number = payload.start_from + i
        session.add(team)
    session.commit()
    all_teams = session.exec(select(Team).where(Team.event_id == event_id).order_by(Team.created_at)).all()
    return [team_to_read(t) for t in all_teams]


@router.get("/events/{event_id}/entries.csv")
def export_entries_csv(event_id: int, session: Session = Depends(get_session), user: User = Depends(require_organizer)):
    event = get_managed_event(event_id, user, session)
    legs = session.exec(select(Leg).where(Leg.event_id == event_id).order_by(Leg.order)).all()
    cats = {c.id: c.name for c in session.exec(select(Category).where(Category.event_id == event_id)).all()}
    teams = session.exec(select(Team).where(Team.event_id == event_id).order_by(Team.start_number, Team.created_at)).all()

    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";")
    writer.writerow(
        ["St. číslo", "Tým", "Oddíl", "Kategorie", "Stav", "Zaplaceno", "Pořadí", "Čas", "Kapitán", "E-mail", "Telefon"]
        + [f"{leg.order}. úsek – {leg.name}" for leg in legs]
        + ["Poznámka", "Přihlášeno"]
    )
    for t in teams:
        by_leg = {m.leg_id: m.name for m in t.member_rows}
        writer.writerow(
            [
                t.start_number or "",
                t.name,
                t.club or "",
                cats.get(t.category_id, ""),
                TEAM_STATUS_CZ[t.status],
                "ano" if t.paid else "ne",
                "DNF" if t.dnf else (t.place or ""),
                t.finish_time or "",
                t.contact_name,
                t.contact_email,
                t.contact_phone or "",
            ]
            + [by_leg.get(leg.id, "") for leg in legs]
            + [t.note or "", t.created_at.strftime("%Y-%m-%d %H:%M")]
        )
    content = "﻿" + buf.getvalue()  # BOM, aby Excel poznal UTF-8
    filename = f"prihlasky-{event.slug or event.id}.csv"
    return Response(
        content=content.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
