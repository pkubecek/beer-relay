"""Ranking závodníků.

Body za pořadí týmu (v kategorii, pokud ji závod má): 1. 80, 2. 60, 3. 45, 4. 30, 5. 20, 6. 10.
Body dostane každý člen týmu, který má v přihlášce propojený účet.
Do sezóny (kalendářní rok) se sčítají 3 nejlepší závody.
"""
from collections import defaultdict
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..models import Event, EventStatus, Team, TeamMember, TeamStatus, User
from ..services import local_now

router = APIRouter(prefix="/api/ranking", tags=["ranking"])

PLACE_POINTS = {1: 80, 2: 60, 3: 45, 4: 30, 5: 20, 6: 10}
BEST_COUNT = 3


def _season_results(session: Session, year: int):
    """{user_id: [ {event…, points, place, team} ]} – nejvýš jeden výsledek na závod."""
    events = session.exec(
        select(Event).where(
            Event.status != EventStatus.draft,
            Event.count_in_ranking == True,  # noqa: E712
            Event.event_date >= date(year, 1, 1),
            Event.event_date <= date(year, 12, 31),
        )
    ).all()
    by_user = defaultdict(dict)  # user_id -> event_id -> result
    for ev in events:
        teams = session.exec(
            select(Team).where(Team.event_id == ev.id, Team.status == TeamStatus.approved, Team.place != None, Team.dnf == False)  # noqa: E711,E712
        ).all()
        for team in teams:
            points = PLACE_POINTS.get(team.place, 0)
            members = session.exec(select(TeamMember).where(TeamMember.team_id == team.id, TeamMember.user_id != None)).all()  # noqa: E711
            for user_id in {m.user_id for m in members}:
                prev = by_user[user_id].get(ev.id)
                if prev and prev["points"] >= points:
                    continue
                by_user[user_id][ev.id] = {
                    "event_id": ev.id,
                    "event_name": ev.name,
                    "event_slug": ev.slug,
                    "event_date": ev.event_date,
                    "team_name": team.name,
                    "place": team.place,
                    "points": points,
                }
    return by_user


@router.get("")
def get_ranking(year: Optional[int] = None, session: Session = Depends(get_session)):
    year = year or local_now().year
    by_user = _season_results(session, year)
    rows = []
    for user_id, results in by_user.items():
        user = session.get(User, user_id)
        if not user or not user.is_active or user.hide_from_ranking:
            continue
        races = sorted(results.values(), key=lambda r: (-r["points"], r["event_date"]))
        counted = {r["event_id"] for r in races[:BEST_COUNT]}
        for r in races:
            r["counted"] = r["event_id"] in counted
        total = sum(r["points"] for r in races if r["counted"])
        if total == 0:
            continue
        rows.append({
            "user_id": user.id,
            "name": user.full_name,
            "club": user.club,
            "points": total,
            "wins": sum(1 for r in races if r["place"] == 1),
            "races": len(races),
            "results": sorted(races, key=lambda r: r["event_date"]),
        })
    # body → víc vítězství → víc závodů → jméno
    rows.sort(key=lambda r: (-r["points"], -r["wins"], -r["races"], r["name"]))
    prev, place = None, 0
    for i, row in enumerate(rows, start=1):
        key = (row["points"], row["wins"], row["races"])
        if key != prev:
            place, prev = i, key
        row["rank"] = place

    years = sorted(
        {e.event_date.year for e in session.exec(select(Event).where(Event.status != EventStatus.draft, Event.event_date != None)).all()},  # noqa: E711
        reverse=True,
    )
    return {
        "year": year,
        "years": years,
        "best_count": BEST_COUNT,
        "place_points": PLACE_POINTS,
        "rows": rows,
    }
