import os
from sqlmodel import SQLModel, create_engine, Session

# Railway/Postgres provides DATABASE_URL like postgres://... ; SQLAlchemy needs postgresql://
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./beerrelay.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
