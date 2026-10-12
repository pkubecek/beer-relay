import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ["ADMIN_EMAILS"] = "admin@test.cz"

from fastapi.testclient import TestClient  # noqa: E402

from app import database  # noqa: E402
from app.main import app  # noqa: E402


def make_client(db_path):
    database.set_database_url(f"sqlite:///{db_path}")
    return TestClient(app)


@pytest.fixture()
def client(tmp_path):
    with make_client(tmp_path / "test.db") as c:
        yield c


def register(client, email, first="Pepa", last="Novák", password="tajneheslo"):
    r = client.post("/api/auth/register", json={"email": email, "password": password, "first_name": first, "last_name": last})
    assert r.status_code == 201, r.text
    data = r.json()
    return {"Authorization": f"Bearer {data['access_token']}"}, data["user"]
