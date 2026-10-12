import os

from sqlalchemy import inspect, text
from sqlmodel import SQLModel, create_engine, Session

# SQLite lokálně i na Railway (tam na připojeném volume, např. sqlite:////data/beerrelay.db).
# Postgres funguje taky – Railway dává postgres://, SQLAlchemy chce postgresql://
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./beerrelay.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)



def _make_engine(url: str):
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, echo=False, connect_args=connect_args)


engine = _make_engine(DATABASE_URL)


def set_database_url(url: str) -> None:
    """Přepne databázi (používají testy)."""
    global engine, DATABASE_URL
    DATABASE_URL = url
    engine = _make_engine(url)


def _sql_default(column) -> str:
    default = column.default
    if default is None or not getattr(default, "is_scalar", False):
        return ""
    value = default.arg
    if isinstance(value, bool):
        return f" DEFAULT {'TRUE' if value else 'FALSE'}"
    if isinstance(value, (int, float)):
        return f" DEFAULT {value}"
    if hasattr(value, "value"):  # Enum
        value = value.name
    if isinstance(value, str):
        return " DEFAULT '" + value.replace("'", "''") + "'"
    return ""


def _add_missing_columns() -> None:
    """Jednoduchá „migrace“: přidá do existujících tabulek sloupce, které v nich chybí.

    Stačí na rozšiřování modelu o nové (nepovinné / s defaultem) sloupce.
    Mazání či přejmenování sloupců neřeší – na to by byl potřeba Alembic.
    """
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table in SQLModel.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue
            present = {c["name"] for c in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in present:
                    continue
                col_type = column.type.compile(dialect=engine.dialect)
                ddl = f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}{_sql_default(column)}'
                conn.execute(text(ddl))


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _add_missing_columns()
    if DATABASE_URL.startswith("sqlite"):
        with engine.begin() as conn:
            conn.execute(text("PRAGMA journal_mode=WAL"))


def get_session():
    with Session(engine) as session:
        yield session
