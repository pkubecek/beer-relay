from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..auth import require_admin
from ..models import Event, Leg, Team, TeamStatus, Result, ResultUpsert, ResultRead

router = APIRouter(prefix="/api", tags=["results"])


@router.put("/results", response_model=ResultRead, dependencies=[Depends(require_admin)])
def upsert_result(payload: ResultUpsert, session: Session = Depends(get_session)):
    team = session.get(Team, payload.team_id)
    leg = session.get(Leg, payload.leg_id)
    if not team or not leg:
        raise HTTPException(status_code=404, detail="Tým nebo úsek nenalezen")
    if leg.event_id != team.event_id:
        raise HTTPException(status_code=400, detail="Úsek nepatří k závodu tohoto týmu")

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


@router.get("/events/{event_id}/results/admin", dependencies=[Depends(require_admin)])
def get_all_results_admin(event_id: int, session: Session = Depends(get_session)):
    results = session.exec(
        select(Result).join(Team).where(Team.event_id == event_id)
    ).all()
    return results


@router.get("/events/{event_id}/results")
def get_leaderboard(event_id: int, session: Session = Depends(get_session)):
    """Public computed leaderboard: total = sum(leg times) + penalty_points * penalty_seconds_per_point.
    Teams with any DNF leg are ranked after all finishers, sorted among themselves by name.
    Teams with no results yet are excluded.
    """
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Závod nenalezen")

    legs = session.exec(select(Leg).where(Leg.event_id == event_id).order_by(Leg.order)).all()
    teams = session.exec(
        select(Team).where(Team.event_id == event_id, Team.status == TeamStatus.approved)
    ).all()

    rows = []
    for team in teams:
        results = session.exec(select(Result).where(Result.team_id == team.id)).all()
        results_by_leg = {r.leg_id: r for r in results}
        if not results:
            continue  # nezobrazovat týmy bez jakéhokoliv zapsaného výsledku

        leg_breakdown = []
        total_time = 0
        total_penalty_points = 0
        has_dnf = False
        for leg in legs:
            r = results_by_leg.get(leg.id)
            if r is None:
                leg_breakdown.append({
                    "leg_id": leg.id, "leg_name": leg.name, "order": leg.order,
                    "time_seconds": None, "penalty_points": 0, "dnf": False, "recorded": False,
                })
                continue
            if r.dnf:
                has_dnf = True
            total_time += r.time_seconds or 0
            total_penalty_points += r.penalty_points or 0
            leg_breakdown.append({
                "leg_id": leg.id, "leg_name": leg.name, "order": leg.order,
                "time_seconds": r.time_seconds, "penalty_points": r.penalty_points,
                "dnf": r.dnf, "recorded": True, "note": r.note,
            })

        penalty_seconds = total_penalty_points * event.penalty_seconds_per_point
        total_score = total_time + penalty_seconds

        rows.append({
            "team_id": team.id,
            "team_name": team.name,
            "has_dnf": has_dnf,
            "total_time_seconds": total_time,
            "total_penalty_points": total_penalty_points,
            "penalty_seconds": penalty_seconds,
            "total_score_seconds": total_score,
            "legs": leg_breakdown,
        })

    finishers = sorted([r for r in rows if not r["has_dnf"]], key=lambda r: r["total_score_seconds"])
    dnfs = sorted([r for r in rows if r["has_dnf"]], key=lambda r: r["team_name"])

    ranked = []
    for i, r in enumerate(finishers, start=1):
        r["rank"] = i
        ranked.append(r)
    for r in dnfs:
        r["rank"] = None
        ranked.append(r)

    return {
        "event": {"id": event.id, "name": event.name, "penalty_seconds_per_point": event.penalty_seconds_per_point},
        "legs": [{"id": l.id, "name": l.name, "order": l.order} for l in legs],
        "results": ranked,
    }
