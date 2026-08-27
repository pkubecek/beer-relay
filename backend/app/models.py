from datetime import datetime, date
from enum import Enum
from typing import Optional, List

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import UniqueConstraint


class EventStatus(str, Enum):
    draft = "draft"          # not visible publicly yet
    open = "open"            # registration open
    closed = "closed"        # registration closed, race day / results being entered
    finished = "finished"    # results published


class TeamStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


# ---------- Event ----------

class EventBase(SQLModel):
    name: str
    slug: Optional[str] = Field(default=None, index=True, unique=True)
    location: Optional[str] = None
    event_date: Optional[date] = None
    description: Optional[str] = None
    penalty_seconds_per_point: int = 60  # default: 1 trestný bod = 60s
    status: EventStatus = EventStatus.draft


class Event(EventBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    legs: List["Leg"] = Relationship(back_populates="event", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    teams: List["Team"] = Relationship(back_populates="event", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class EventCreate(EventBase):
    pass


class EventUpdate(SQLModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[date] = None
    description: Optional[str] = None
    penalty_seconds_per_point: Optional[int] = None
    status: Optional[EventStatus] = None


class EventRead(EventBase):
    id: int
    created_at: datetime


# ---------- Leg (úsek štafety) ----------

class LegBase(SQLModel):
    order: int
    name: str
    description: Optional[str] = None


class Leg(LegBase, table=True):
    __table_args__ = (UniqueConstraint("event_id", "order", name="uq_leg_event_order"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="event.id")

    event: Optional[Event] = Relationship(back_populates="legs")
    results: List["Result"] = Relationship(back_populates="leg", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class LegCreate(LegBase):
    pass


class LegRead(LegBase):
    id: int
    event_id: int


# ---------- Team ----------

class TeamBase(SQLModel):
    name: str
    contact_name: str
    contact_email: str
    contact_phone: Optional[str] = None
    members: Optional[str] = None  # free text: jména členů po úsecích
    note: Optional[str] = None


class Team(TeamBase, table=True):
    __table_args__ = (UniqueConstraint("event_id", "name", name="uq_team_event_name"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="event.id")
    status: TeamStatus = TeamStatus.pending
    created_at: datetime = Field(default_factory=datetime.utcnow)

    event: Optional[Event] = Relationship(back_populates="teams")
    results: List["Result"] = Relationship(back_populates="team", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class TeamCreate(TeamBase):
    pass


class TeamRead(TeamBase):
    id: int
    event_id: int
    status: TeamStatus
    created_at: datetime


class TeamStatusUpdate(SQLModel):
    status: TeamStatus


# ---------- Result (čas + penalta týmu na úseku) ----------

class ResultBase(SQLModel):
    time_seconds: Optional[int] = None  # None = ještě nezaběhnuto / DNF
    penalty_points: int = 0
    dnf: bool = False
    note: Optional[str] = None


class Result(ResultBase, table=True):
    __table_args__ = (UniqueConstraint("team_id", "leg_id", name="uq_result_team_leg"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="team.id")
    leg_id: int = Field(foreign_key="leg.id")

    team: Optional[Team] = Relationship(back_populates="results")
    leg: Optional[Leg] = Relationship(back_populates="results")


class ResultUpsert(ResultBase):
    team_id: int
    leg_id: int


class ResultRead(ResultBase):
    id: int
    team_id: int
    leg_id: int


# ---------- Admin ----------

class AdminLogin(SQLModel):
    password: str


class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"
