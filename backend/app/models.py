from datetime import datetime, date
from enum import Enum
from typing import Optional, List

from pydantic import EmailStr
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import UniqueConstraint


# =====================================================================
# Enums
# =====================================================================

class UserRole(str, Enum):
    user = "user"            # běžný závodník – přihlašuje týmy
    organizer = "organizer"  # pořadatel – zakládá a spravuje vlastní závody
    admin = "admin"          # správce systému – vše + správa uživatelů


ROLE_LEVEL = {UserRole.user: 0, UserRole.organizer: 1, UserRole.admin: 2}


class EventStatus(str, Enum):
    draft = "draft"          # neveřejný koncept
    open = "open"            # přihlášky otevřené (v rámci termínů)
    closed = "closed"        # přihlášky uzavřené, závod se chystá/běží
    finished = "finished"    # výsledky zveřejněny


class TeamStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


# =====================================================================
# User
# =====================================================================

class UserBase(SQLModel):
    first_name: str
    last_name: str
    birth_year: Optional[int] = None
    club: Optional[str] = None       # oddíl / parta
    phone: Optional[str] = None


class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    role: UserRole = UserRole.user
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # žádost závodníka o právo zakládat závody (vyřizuje admin)
    organizer_request_at: Optional[datetime] = None
    organizer_request_note: Optional[str] = None

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class UserRegister(UserBase):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class UserLogin(SQLModel):
    email: EmailStr
    password: str


class UserRead(UserBase):
    id: int
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    organizer_request_at: Optional[datetime] = None
    organizer_request_note: Optional[str] = None


class OrganizerRequestIn(SQLModel):
    note: Optional[str] = Field(default=None, max_length=1000)


class UserUpdate(SQLModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    birth_year: Optional[int] = None
    club: Optional[str] = None
    phone: Optional[str] = None


class PasswordChange(SQLModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=72)


class AccountDelete(SQLModel):
    password: str


class AdminUserUpdate(SQLModel):
    """Úprava účtu adminem. Roli lze nastavit jen na závodník / pořadatel – admin se přiděluje přes ADMIN_EMAILS."""
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    new_password: Optional[str] = Field(default=None, min_length=8, max_length=72)
    dismiss_request: bool = False   # zamítnout žádost o pořádání
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    birth_year: Optional[int] = None
    club: Optional[str] = None
    phone: Optional[str] = None


class AdminUserRead(UserRead):
    events_count: int = 0      # kolik závodů pořádá
    entries_count: int = 0     # v kolika týmech je kapitán


class AuthResponse(SQLModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


# =====================================================================
# Event
# =====================================================================

class EventBase(SQLModel):
    name: str
    slug: Optional[str] = Field(default=None, index=True, unique=True)
    location: Optional[str] = None
    event_date: Optional[date] = None
    start_time: Optional[str] = None            # "10:00"
    description: Optional[str] = None
    lat: Optional[float] = None                  # místo závodu (WGS84)
    lon: Optional[float] = None
    status: EventStatus = EventStatus.draft
    # přihlášky (po vzoru ORISu)
    entries_open_at: Optional[datetime] = None   # od kdy lze přihlašovat (místní čas)
    entry_deadline: Optional[datetime] = None    # uzávěrka přihlášek (místní čas)
    entry_fee: Optional[int] = None              # startovné za tým v Kč
    max_teams: Optional[int] = None              # kapacita závodu
    require_approval: bool = True                # přihláška musí být schválena pořadatelem
    contact_email: Optional[str] = None
    website: Optional[str] = None


class Event(EventBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # Penalizace se nepoužívá; sloupec zůstává jen kvůli existujícím databázím (NOT NULL).
    penalty_seconds_per_point: int = 0
    organizer_id: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    legs: List["Leg"] = Relationship(back_populates="event", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    categories: List["Category"] = Relationship(back_populates="event", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    teams: List["Team"] = Relationship(back_populates="event", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class EventCreate(EventBase):
    pass


class EventUpdate(SQLModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[date] = None
    start_time: Optional[str] = None
    description: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    status: Optional[EventStatus] = None
    entries_open_at: Optional[datetime] = None
    entry_deadline: Optional[datetime] = None
    entry_fee: Optional[int] = None
    max_teams: Optional[int] = None
    require_approval: Optional[bool] = None
    contact_email: Optional[str] = None
    website: Optional[str] = None
    organizer_id: Optional[int] = None  # mění jen admin


class EventRead(EventBase):
    id: int
    organizer_id: Optional[int] = None
    created_at: datetime
    # dopočítané hodnoty
    organizer_name: Optional[str] = None
    team_count: int = 0
    registration_open: bool = False
    registration_message: Optional[str] = None
    can_manage: bool = False


# =====================================================================
# Leg (úsek štafety)
# =====================================================================

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


# =====================================================================
# Category (kategorie – např. Muži / Ženy / Mix)
# =====================================================================

class CategoryBase(SQLModel):
    name: str
    description: Optional[str] = None
    order: int = 0
    max_teams: Optional[int] = None


class Category(CategoryBase, table=True):
    __table_args__ = (UniqueConstraint("event_id", "name", name="uq_category_event_name"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="event.id")

    event: Optional[Event] = Relationship(back_populates="categories")


class CategoryCreate(CategoryBase):
    pass


class CategoryRead(CategoryBase):
    id: int
    event_id: int
    team_count: int = 0


# =====================================================================
# Team (přihláška štafety)
# =====================================================================

class Team(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("event_id", "name", name="uq_team_event_name"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="event.id")
    name: str
    club: Optional[str] = None
    category_id: Optional[int] = Field(default=None, foreign_key="category.id")
    captain_id: Optional[int] = Field(default=None, foreign_key="user.id")
    contact_name: str
    contact_email: str
    contact_phone: Optional[str] = None
    members: Optional[str] = None  # starý volný text (zpětná kompatibilita)
    note: Optional[str] = None
    status: TeamStatus = TeamStatus.pending
    paid: bool = False
    start_number: Optional[int] = None
    # výsledek týmu – stačí pořadí, čas je nepovinný
    place: Optional[int] = None              # pořadí (v kategorii, pokud závod kategorie má)
    finish_time: Optional[str] = None        # volný text, např. "1:23:45"
    dnf: bool = False                        # nedokončil / diskvalifikace
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    event: Optional[Event] = Relationship(back_populates="teams")
    results: List["Result"] = Relationship(back_populates="team", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    member_rows: List["TeamMember"] = Relationship(back_populates="team", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class TeamMember(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="team.id", index=True)
    leg_id: Optional[int] = Field(default=None, foreign_key="leg.id")
    name: str
    email: Optional[str] = None                     # neveřejné, slouží k propojení s účtem
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)

    team: Optional[Team] = Relationship(back_populates="member_rows")


class TeamMemberIn(SQLModel):
    leg_id: Optional[int] = None
    name: str
    email: Optional[str] = None


class TeamMemberPublic(SQLModel):
    leg_id: Optional[int] = None
    name: str


class TeamMemberRead(TeamMemberPublic):
    id: int
    email: Optional[str] = None
    user_id: Optional[int] = None


class TeamEntryIn(SQLModel):
    """Přihláška týmu vyplněná přihlášeným uživatelem (kapitánem)."""
    name: str = Field(min_length=1, max_length=80)
    club: Optional[str] = None
    category_id: Optional[int] = None
    contact_phone: Optional[str] = None
    note: Optional[str] = None
    members: List[TeamMemberIn] = []


class TeamPublic(SQLModel):
    id: int
    event_id: int
    name: str
    club: Optional[str] = None
    category_id: Optional[int] = None
    status: TeamStatus
    start_number: Optional[int] = None
    created_at: datetime
    members: List[TeamMemberPublic] = []


class TeamRead(TeamPublic):
    place: Optional[int] = None
    finish_time: Optional[str] = None
    dnf: bool = False
    captain_id: Optional[int] = None
    contact_name: str
    contact_email: str
    contact_phone: Optional[str] = None
    legacy_members: Optional[str] = None
    note: Optional[str] = None
    paid: bool
    updated_at: Optional[datetime] = None
    members: List[TeamMemberRead] = []


class MyEntryRead(TeamRead):
    event_name: str
    event_slug: Optional[str] = None
    event_date: Optional[date] = None
    category_name: Optional[str] = None
    is_captain: bool = False
    can_edit: bool = False


class TeamAdminUpdate(SQLModel):
    status: Optional[TeamStatus] = None
    paid: Optional[bool] = None
    start_number: Optional[int] = None
    category_id: Optional[int] = None


class StartNumbersRequest(SQLModel):
    start_from: int = 1
    only_approved: bool = True


class TeamResultIn(SQLModel):
    team_id: int
    place: Optional[int] = Field(default=None, ge=1)
    finish_time: Optional[str] = None
    dnf: bool = False


# =====================================================================
# Result (časy po úsecích – starý způsob, ponecháno kvůli existujícím databázím)
# =====================================================================

class ResultBase(SQLModel):
    time_seconds: Optional[int] = None  # None = ještě nezaběhnuto / DNF
    dnf: bool = False
    note: Optional[str] = None


class Result(ResultBase, table=True):
    __table_args__ = (UniqueConstraint("team_id", "leg_id", name="uq_result_team_leg"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    penalty_points: int = 0  # nepoužívá se, jen kvůli existujícím databázím
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
