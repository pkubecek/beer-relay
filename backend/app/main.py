import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from .auth import ADMIN_EMAILS, apply_bootstrap_admin
from . import database
from .database import init_db
from .models import User
from .routers import auth_router, events_router, results_router, teams_router, users_router


def _promote_bootstrap_admins() -> None:
    if not ADMIN_EMAILS:
        return
    with Session(database.engine) as session:
        for user in session.exec(select(User)).all():
            if apply_bootstrap_admin(user):
                session.add(user)
        session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    _promote_bootstrap_admins()
    yield


app = FastAPI(title="Pivní štafety", version="2.0.0", lifespan=lifespan)

allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(events_router.router)
app.include_router(teams_router.router)
app.include_router(results_router.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
