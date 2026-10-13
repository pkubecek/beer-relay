"""Sdílená logika: stav přihlášek, převody modelů na výstupní schémata."""
import os
from datetime import datetime
from typing import Optional, Tuple
from zoneinfo import ZoneInfo

from sqlalchemy import func
from sqlmodel import Session, select

from .auth import can_manage_event
from .models import (
    Category,
    Event,
    EventRead,
    EventStatus,
    Team,
    TeamMember,
    TeamMemberPublic,
    TeamMemberRead,
    TeamPublic,
    TeamRead,
    TeamStatus,
    User,
)

TEAM_STATUS_CZ = {TeamStatus.pending: "čeká", TeamStatus.approved: "schváleno", TeamStatus.rejected: "zamítnuto"}

# Termíny přihlášek se zadávají v místním čase pořadatele.
LOCAL_TZ = ZoneInfo(os.getenv("APP_TIMEZONE", "Europe/Prague"))


def local_now() -> datetime:
    return datetime.now(LOCAL_TZ).replace(tzinfo=None)


def active_team_count(session: Session, event_id: int, category_id: Optional[int] = None) -> int:
    stmt = select(func.count(Team.id)).where(Team.event_id == event_id, Team.status != TeamStatus.rejected)
    if category_id is not None:
        stmt = stmt.where(Team.category_id == category_id)
    return session.exec(stmt).one()


def registration_state(event: Event, session: Session) -> Tuple[bool, Optional[str]]:
    """Vrací (lze se přihlásit?, vysvětlení pro uživatele)."""
    if event.status != EventStatus.open:
        return False, "Přihlášky nejsou otevřené."
    now = local_now()
    if event.entries_open_at and now < event.entries_open_at:
        return False, f"Přihlášky se otevírají {event.entries_open_at:%d. %m. %Y %H:%M}."
    if event.entry_deadline and now > event.entry_deadline:
        return False, "Uzávěrka přihlášek už proběhla."
    if event.max_teams is not None and active_team_count(session, event.id) >= event.max_teams:
        return False, "Kapacita závodu je naplněná."
    return True, None


def event_to_read(event: Event, session: Session, user: Optional[User] = None) -> EventRead:
    open_, message = registration_state(event, session)
    organizer = session.get(User, event.organizer_id) if event.organizer_id else None
    return EventRead(
        **event.model_dump(),
        organizer_name=organizer.full_name if organizer else None,
        team_count=active_team_count(session, event.id),
        registration_open=open_,
        registration_message=message,
        can_manage=can_manage_event(user, event),
    )


def _members_sorted(team: Team):
    return sorted(team.member_rows, key=lambda m: (m.leg_id is None, m.leg_id or 0, m.id or 0))


def team_to_public(team: Team) -> TeamPublic:
    return TeamPublic(
        id=team.id,
        event_id=team.event_id,
        name=team.name,
        club=team.club,
        category_id=team.category_id,
        status=team.status,
        start_number=team.start_number,
        created_at=team.created_at,
        members=[TeamMemberPublic(leg_id=m.leg_id, name=m.name) for m in _members_sorted(team)],
    )


def team_to_read(team: Team) -> TeamRead:
    return TeamRead(
        id=team.id,
        event_id=team.event_id,
        name=team.name,
        club=team.club,
        category_id=team.category_id,
        status=team.status,
        start_number=team.start_number,
        created_at=team.created_at,
        captain_id=team.captain_id,
        contact_name=team.contact_name,
        contact_email=team.contact_email,
        contact_phone=team.contact_phone,
        legacy_members=team.members,
        note=team.note,
        paid=team.paid,
        place=team.place,
        finish_time=team.finish_time,
        dnf=team.dnf,
        updated_at=team.updated_at,
        members=[
            TeamMemberRead(id=m.id, leg_id=m.leg_id, name=m.name, email=m.email, user_id=m.user_id)
            for m in _members_sorted(team)
        ],
    )


def category_belongs(session: Session, category_id: Optional[int], event_id: int) -> Optional[Category]:
    if category_id is None:
        return None
    cat = session.get(Category, category_id)
    if not cat or cat.event_id != event_id:
        return None
    return cat


def team_member_user_ids(session: Session, team_id: int) -> set:
    rows = session.exec(select(TeamMember.user_id).where(TeamMember.team_id == team_id)).all()
    return {r for r in rows if r is not None}


def delete_account(session: Session, user: User) -> None:
    """Smaže účet a osobní údaje profilu.

    - přihlášky na nadcházející závody (bez výsledku), kde je uživatel kapitánem, se zruší,
    - přihlášky a výsledky proběhlých závodů zůstanou, jen bez vazby na účet a bez kontaktů,
    - závody, které uživatel pořádal, zůstanou (spravuje je dál admin).
    """
    today = datetime.now(LOCAL_TZ).date()
    for t in session.exec(select(Team).where(Team.captain_id == user.id)).all():
        ev = session.get(Event, t.event_id)
        upcoming = ev is None or ev.event_date is None or ev.event_date >= today
        if upcoming and t.place is None and not t.dnf:
            session.delete(t)
            continue
        t.captain_id = None
        t.contact_email = ""
        t.contact_phone = None
        session.add(t)
    for m in session.exec(select(TeamMember).where(TeamMember.user_id == user.id)).all():
        m.user_id = None
        m.email = None
        session.add(m)
    for ev in session.exec(select(Event).where(Event.organizer_id == user.id)).all():
        ev.organizer_id = None
        session.add(ev)
    session.flush()
    session.delete(user)
    session.commit()
