from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..auth import can_manage_event, get_managed_event, get_optional_user, require_organizer
from ..database import get_session
from ..models import Category, Event, EventStatus, Leg, Team, TeamRead, TeamResultIn, TeamStatus, User
from ..services import team_to_read

router = APIRouter(prefix="/api", tags=["results"])


@router.put("/events/{event_id}/results", response_model=List[TeamRead])
def save_results(
    event_id: int,
    payload: List[TeamResultIn],
    session: Session = Depends(get_session),
    user: User = Depends(require_organizer),
):
    """Uloží výsledky naráz: ke každému týmu pořadí, případně čas (nepovinný) nebo DNF."""
    get_managed_event(event_id, user, session)
    for row in payload:
        team = session.get(Team, row.team_id)
        if not team or team.event_id != event_id:
            raise HTTPException(status_code=400, detail="Tým nepatří k tomuto závodu")
        team.dnf = row.dnf
        team.place = None if row.dnf else row.place
        team.finish_time = (row.finish_time or "").strip() or None
        session.add(team)
    session.commit()
    teams = session.exec(select(Team).where(Team.event_id == event_id).order_by(Team.created_at)).all()
    return [team_to_read(t) for t in teams]


@router.get("/events/{event_id}/results")
def get_results(
    event_id: int,
    session: Session = Depends(get_session),
    user: Optional[User] = Depends(get_optional_user),
):
    """Veřejná výsledková listina podle zadaného pořadí.

    Pořadí se zadává ručně (v rámci kategorie, pokud závod kategorie má).
    Týmy bez pořadí a bez DNF se nezobrazují. DNF jsou na konci.
    """
    event = session.get(Event, event_id)
    if not event or (event.status == EventStatus.draft and not can_manage_event(user, event)):
        raise HTTPException(status_code=404, detail="Závod nenalezen")

    legs = session.exec(select(Leg).where(Leg.event_id == event_id).order_by(Leg.order)).all()
    categories = session.exec(select(Category).where(Category.event_id == event_id).order_by(Category.order, Category.name)).all()
    teams = session.exec(select(Team).where(Team.event_id == event_id, Team.status == TeamStatus.approved)).all()

    rows = []
    for team in teams:
        if team.place is None and not team.dnf:
            continue
        by_leg = {m.leg_id: m.name for m in team.member_rows}
        rows.append({
            "team_id": team.id,
            "team_name": team.name,
            "club": team.club,
            "start_number": team.start_number,
            "category_id": team.category_id,
            "place": team.place,
            "finish_time": team.finish_time,
            "dnf": team.dnf,
            "runners": [by_leg.get(leg.id) for leg in legs],
        })

    cat_order = {c.id: i for i, c in enumerate(categories)}
    rows.sort(key=lambda r: (cat_order.get(r["category_id"], 10_000), r["dnf"], r["place"] or 0, r["team_name"]))

    return {
        "event": {"id": event.id, "name": event.name, "status": event.status},
        "legs": [{"id": leg.id, "name": leg.name, "order": leg.order} for leg in legs],
        "categories": [{"id": c.id, "name": c.name} for c in categories],
        "results": rows,
    }
