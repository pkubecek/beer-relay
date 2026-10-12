from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..auth import can_manage_event, get_managed_event, get_optional_user, require_organizer
from ..database import get_session
from ..models import Category, Event, EventStatus, Leg, Result, ResultRead, ResultUpsert, Team, TeamStatus, User

router = APIRouter(prefix="/api", tags=["results"])


@router.put("/results", response_model=ResultRead)
def upsert_result(payload: ResultUpsert, session: Session = Depends(get_session), user: User = Depends(require_organizer)):
    team = session.get(Team, payload.team_id)
    leg = session.get(Leg, payload.leg_id)
    if not team or not leg:
        raise HTTPException(status_code=404, detail="Tým nebo úsek nenalezen")
    if leg.event_id != team.event_id:
        raise HTTPException(status_code=400, detail="Úsek nepatří k závodu tohoto týmu")
    get_managed_event(team.event_id, user, session)

    existing = session.exec(
        select(Result).where(Result.team_id == payload.team_id, Result.leg_id == payload.leg_id)
    ).first()
    if existing:
        existing.time_seconds = payload.time_seconds
        existing.penalty_points = payload.penalty_points
        existing.dnf = payload.dnf
        existing.note = payload.note
        result = existing
    else:
        result = Result(**payload.model_dump())
    session.add(result)
    session.commit()
    session.refresh(result)
    return result


@router.get("/events/{event_id}/results/manage", response_model=List[ResultRead])
def get_all_results_manage(event_id: int, session: Session = Depends(get_session), user: User = Depends(require_organizer)):
    get_managed_event(event_id, user, session)
    return session.exec(select(Result).join(Team).where(Team.event_id == event_id)).all()


def _rank(rows: list, key: str) -> None:
    finishers = sorted([r for r in rows if not r["has_dnf"]], key=lambda r: r["total_score_seconds"])
    position = 0
    previous = None
    for i, r in enumerate(finishers, start=1):
        if r["total_score_seconds"] != previous:
            position = i
            previous = r["total_score_seconds"]
        r[key] = position  # stejný čas = stejné místo
    for r in rows:
        if r["has_dnf"]:
            r[key] = None


@router.get("/events/{event_id}/results")
def get_leaderboard(
    event_id: int,
    session: Session = Depends(get_session),
    user: Optional[User] = Depends(get_optional_user),
):
    """Veřejná výsledková listina.

    Výsledek = součet časů úseků + trestné body × penalty_seconds_per_point.
    Týmy s DNF na libovolném úseku jsou za všemi, kdo doběhli. Pořadí se počítá
    celkově (`rank`) i v rámci kategorie (`category_rank`).
    """
    event = session.get(Event, event_id)
    if not event or (event.status == EventStatus.draft and not can_manage_event(user, event)):
        raise HTTPException(status_code=404, detail="Závod nenalezen")

    legs = session.exec(select(Leg).where(Leg.event_id == event_id).order_by(Leg.order)).all()
    categories = session.exec(select(Category).where(Category.event_id == event_id).order_by(Category.order, Category.name)).all()
    teams = session.exec(select(Team).where(Team.event_id == event_id, Team.status == TeamStatus.approved)).all()

    rows = []
    for team in teams:
        results_by_leg = {r.leg_id: r for r in team.results}
        if not results_by_leg:
            continue  # nezobrazovat týmy bez zapsaného výsledku
        members_by_leg = {m.leg_id: m.name for m in team.member_rows}

        leg_breakdown = []
        total_time = 0
        total_penalty_points = 0
        has_dnf = False
        complete = True
        for leg in legs:
            r = results_by_leg.get(leg.id)
            base = {"leg_id": leg.id, "leg_name": leg.name, "order": leg.order, "runner": members_by_leg.get(leg.id)}
            if r is None:
                complete = False
                leg_breakdown.append({**base, "time_seconds": None, "penalty_points": 0, "dnf": False, "recorded": False})
                continue
            if r.dnf:
                has_dnf = True
            total_time += r.time_seconds or 0
            total_penalty_points += r.penalty_points or 0
            leg_breakdown.append(
                {**base, "time_seconds": r.time_seconds, "penalty_points": r.penalty_points, "dnf": r.dnf, "recorded": True, "note": r.note}
            )

        penalty_seconds = total_penalty_points * event.penalty_seconds_per_point
        rows.append({
            "team_id": team.id,
            "team_name": team.name,
            "club": team.club,
            "start_number": team.start_number,
            "category_id": team.category_id,
            "has_dnf": has_dnf,
            "complete": complete,
            "total_time_seconds": total_time,
            "total_penalty_points": total_penalty_points,
            "penalty_seconds": penalty_seconds,
            "total_score_seconds": total_time + penalty_seconds,
            "legs": leg_breakdown,
        })

    _rank(rows, "rank")
    by_cat = {}
    for r in rows:
        by_cat.setdefault(r["category_id"], []).append(r)
    for group in by_cat.values():
        _rank(group, "category_rank")

    rows.sort(key=lambda r: (r["has_dnf"], r["total_score_seconds"] if not r["has_dnf"] else 0, r["team_name"]))

    return {
        "event": {"id": event.id, "name": event.name, "penalty_seconds_per_point": event.penalty_seconds_per_point, "status": event.status},
        "legs": [{"id": leg.id, "name": leg.name, "order": leg.order} for leg in legs],
        "categories": [{"id": c.id, "name": c.name} for c in categories],
        "results": rows,
    }
