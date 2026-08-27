from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..auth import require_admin
from ..models import Event, Team, TeamCreate, TeamRead, TeamStatus, TeamStatusUpdate

router = APIRouter(prefix="/api", tags=["teams"])


@router.get("/events/{event_id}/teams", response_model=List[TeamRead])
def list_approved_teams(event_id: int, session: Session = Depends(get_session)):
    teams = session.exec(
        select(Team).where(Team.event_id == event_id, Team.status == TeamStatus.approved).order_by(Team.name)
    ).all()
    return teams


@router.get(
    "/events/{event_id}/teams/admin",
    response_model=List[TeamRead],
    dependencies=[Depends(require_admin)],
)
def list_all_teams_admin(event_id: int, session: Session = Depends(get_session)):
    teams = session.exec(
        select(Team).where(Team.event_id == event_id).order_by(Team.created_at)
    ).all()
    return teams


@router.post("/events/{event_id}/teams", response_model=TeamRead)
def register_team(event_id: int, payload: TeamCreate, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Závod nenalezen")
    if event.status != "open":
        raise HTTPException(status_code=400, detail="Registrace do tohoto závodu není otevřená")
    team = Team(event_id=event_id, **payload.model_dump())
    session.add(team)
    try:
        session.commit()
    except Exception:
        session.rollback()
        raise HTTPException(status_code=400, detail="Tým s tímto názvem je už v tomto závodě přihlášený")
    session.refresh(team)
    return team


@router.patch("/teams/{team_id}/status", response_model=TeamRead, dependencies=[Depends(require_admin)])
def update_team_status(team_id: int, payload: TeamStatusUpdate, session: Session = Depends(get_session)):
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Tým nenalezen")
    team.status = payload.status
    session.add(team)
    session.commit()
    session.refresh(team)
    return team


@router.delete("/teams/{team_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_team(team_id: int, session: Session = Depends(get_session)):
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Tým nenalezen")
    session.delete(team)
    session.commit()
