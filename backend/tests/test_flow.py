from datetime import datetime, timedelta

from tests.conftest import register


def make_organizer(client):
    admin_h, _ = register(client, "admin@test.cz", "Ada", "Adminová")
    org_h, org = register(client, "org@test.cz", "Olga", "Pořadatelová")
    r = client.patch(f"/api/users/{org['id']}", json={"role": "organizer"}, headers=admin_h)
    assert r.status_code == 200 and r.json()["role"] == "organizer"
    return admin_h, org_h


def make_event(client, org_h, **extra):
    body = {"name": "Pivní štafeta Říp 2026", "event_date": "2030-05-01", "status": "open", "entry_fee": 400, **extra}
    r = client.post("/api/events", json=body, headers=org_h)
    assert r.status_code == 201, r.text
    ev = r.json()
    for i, name in enumerate(["Les", "Hospoda", "Kopec"], start=1):
        assert client.post(f"/api/events/{ev['id']}/legs", json={"order": i, "name": name}, headers=org_h).status_code == 201
    return ev


def test_auth_basics(client):
    h, user = register(client, "Pepa@Test.cz")
    assert user["email"] == "pepa@test.cz" and user["role"] == "user"
    assert client.post("/api/auth/register", json={"email": "pepa@test.cz", "password": "xxxxxxxx", "first_name": "a", "last_name": "b"}).status_code == 400
    assert client.post("/api/auth/login", json={"email": "pepa@test.cz", "password": "spatne"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "pepa@test.cz", "password": "tajneheslo"}).status_code == 200
    assert client.get("/api/auth/me", headers=h).json()["email"] == "pepa@test.cz"
    assert client.patch("/api/auth/me", json={"club": "SK Pivo"}, headers=h).json()["club"] == "SK Pivo"
    assert client.post("/api/auth/me/password", json={"current_password": "tajneheslo", "new_password": "noveheslo1"}, headers=h).status_code == 204
    assert client.post("/api/auth/login", json={"email": "pepa@test.cz", "password": "noveheslo1"}).status_code == 200
    # bootstrap admin
    _, admin = register(client, "admin@test.cz")
    assert admin["role"] == "admin"
    # běžný uživatel nesmí zakládat závody ani spravovat uživatele
    assert client.post("/api/events", json={"name": "x"}, headers=h).status_code == 403
    assert client.get("/api/users", headers=h).status_code == 403


def test_full_entry_and_results_flow(client):
    admin_h, org_h = make_organizer(client)
    ev = make_event(client, org_h, max_teams=3)
    cats = [client.post(f"/api/events/{ev['id']}/categories", json={"name": n, "order": i}, headers=org_h).json() for i, n in enumerate(["Muži", "Mix"])]
    legs = client.get(f"/api/events/{ev['id']}/legs").json()

    # draft jiného pořadatele / kalendář
    assert client.get("/api/events").json()[0]["registration_open"] is True

    cap_h, cap = register(client, "kapitan@test.cz", "Karel", "Kapitán")
    # bez kategorie neprojde
    r = client.post(f"/api/events/{ev['id']}/entries", json={"name": "Lesní vlci"}, headers=cap_h)
    assert r.status_code == 422
    members = [{"leg_id": legs[0]["id"], "name": "Karel Kapitán", "email": "kapitan@test.cz"},
               {"leg_id": legs[1]["id"], "name": "Jana Malá", "email": "jana@test.cz"}]
    r = client.post(f"/api/events/{ev['id']}/entries", json={"name": "Lesní vlci", "category_id": cats[0]["id"], "members": members}, headers=cap_h)
    assert r.status_code == 201, r.text
    team = r.json()
    assert team["status"] == "pending" and team["contact_email"] == "kapitan@test.cz"
    assert team["members"][0]["user_id"] == cap["id"]

    # duplicitní úsek
    r = client.put(f"/api/entries/{team['id']}", json={"name": "Lesní vlci", "category_id": cats[0]["id"], "members": members + [{"leg_id": legs[0]["id"], "name": "X"}]}, headers=cap_h)
    assert r.status_code == 422

    # Jana se registruje později -> přihláška se jí propojí
    jana_h, _ = register(client, "jana@test.cz", "Jana", "Malá")
    mine = client.get("/api/me/entries", headers=jana_h).json()
    assert len(mine) == 1 and mine[0]["is_captain"] is False and mine[0]["can_edit"] is False
    assert client.put(f"/api/entries/{team['id']}", json={"name": "Hack"}, headers=jana_h).status_code == 403

    # veřejný seznam neobsahuje e-maily
    public = client.get(f"/api/events/{ev['id']}/entries").json()
    assert "contact_email" not in public[0] and "email" not in public[0]["members"][0]

    # duplicitní název týmu
    other_h, _ = register(client, "other@test.cz")
    assert client.post(f"/api/events/{ev['id']}/entries", json={"name": "Lesní vlci", "category_id": cats[1]["id"]}, headers=other_h).status_code == 400
    t2 = client.post(f"/api/events/{ev['id']}/entries", json={"name": "Mixíci", "category_id": cats[1]["id"]}, headers=other_h).json()
    t3 = client.post(f"/api/events/{ev['id']}/entries", json={"name": "Třetí", "category_id": cats[1]["id"]}, headers=other_h).json()
    # kapacita 3 -> plno
    r = client.post(f"/api/events/{ev['id']}/entries", json={"name": "Čtvrtí", "category_id": cats[1]["id"]}, headers=other_h)
    assert r.status_code == 400 and "Kapacita" in r.json()["detail"]
    assert client.get(f"/api/events/{ev['slug']}").json()["registration_open"] is False

    # pořadatel schvaluje, cizí uživatel ne
    assert client.patch(f"/api/entries/{team['id']}/manage", json={"status": "approved"}, headers=cap_h).status_code == 403
    for t in (team, t2):
        assert client.patch(f"/api/entries/{t['id']}/manage", json={"status": "approved", "paid": True}, headers=org_h).status_code == 200
    client.patch(f"/api/entries/{t3['id']}/manage", json={"status": "rejected"}, headers=org_h)

    nums = client.post(f"/api/events/{ev['id']}/start-numbers", json={"start_from": 101}, headers=org_h).json()
    by_name = {t["name"]: t["start_number"] for t in nums}
    assert by_name["Lesní vlci"] == 101 and by_name["Mixíci"] == 102 and by_name["Třetí"] is None

    csv = client.get(f"/api/events/{ev['id']}/entries.csv", headers=org_h)
    assert csv.status_code == 200 and "Lesní vlci" in csv.text and "Jana Malá" in csv.text

    # výsledky
    for t, times in ((team, [600, 700, 800]), (t2, [500, 600, 700])):
        for leg, sec in zip(legs, times):
            r = client.put("/api/results", json={"team_id": t["id"], "leg_id": leg["id"], "time_seconds": sec, "penalty_points": 1}, headers=org_h)
            assert r.status_code == 200
    assert client.put("/api/results", json={"team_id": team["id"], "leg_id": legs[0]["id"], "time_seconds": 1}, headers=cap_h).status_code == 403
    lb = client.get(f"/api/events/{ev['id']}/results").json()
    assert [r["team_name"] for r in lb["results"]] == ["Mixíci", "Lesní vlci"]
    assert lb["results"][0]["rank"] == 1 and lb["results"][0]["category_rank"] == 1
    assert lb["results"][1]["category_rank"] == 1 and lb["results"][1]["total_score_seconds"] == 2100 + 180
    assert lb["results"][1]["legs"][1]["runner"] == "Jana Malá"


def test_deadline_and_permissions(client):
    admin_h, org_h = make_organizer(client)
    past = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%S")
    ev = make_event(client, org_h)
    cap_h, _ = register(client, "cap@test.cz")
    team = client.post(f"/api/events/{ev['id']}/entries", json={"name": "Tým"}, headers=cap_h).json()

    # uzávěrka proběhla
    client.patch(f"/api/events/{ev['id']}", json={"entry_deadline": past}, headers=org_h)
    assert client.post(f"/api/events/{ev['id']}/entries", json={"name": "Pozdě"}, headers=cap_h).status_code == 400
    assert client.put(f"/api/entries/{team['id']}", json={"name": "Přejmenovaný"}, headers=cap_h).status_code == 400
    assert client.delete(f"/api/entries/{team['id']}", headers=cap_h).status_code == 400
    # pořadatel může dohlásit i po uzávěrce
    assert client.post(f"/api/events/{ev['id']}/entries", json={"name": "Dohláška"}, headers=org_h).status_code == 201

    # jiný pořadatel závod nespravuje, admin ano
    other_h, other = register(client, "org2@test.cz")
    client.patch(f"/api/users/{other['id']}", json={"role": "organizer"}, headers=admin_h)
    assert client.patch(f"/api/events/{ev['id']}", json={"name": "X"}, headers=other_h).status_code == 403
    assert client.get("/api/events/manage", headers=other_h).json() == []
    assert len(client.get("/api/events/manage", headers=admin_h).json()) == 1

    # koncept není veřejně vidět
    client.patch(f"/api/events/{ev['id']}", json={"status": "draft"}, headers=org_h)
    assert client.get(f"/api/events/{ev['slug']}").status_code == 404
    assert client.get(f"/api/events/{ev['slug']}", headers=org_h).status_code == 200
    assert client.get("/api/events").json() == []


def test_migration_adds_columns(tmp_path):
    """Stará DB (verze 1) se při startu doplní o nové sloupce a data zůstanou."""
    import sqlite3
    db = tmp_path / "old.db"
    con = sqlite3.connect(db)
    con.executescript("""
        CREATE TABLE event (id INTEGER PRIMARY KEY, name VARCHAR NOT NULL, slug VARCHAR, location VARCHAR, event_date DATE,
            description VARCHAR, penalty_seconds_per_point INTEGER NOT NULL, status VARCHAR(8) NOT NULL, created_at DATETIME NOT NULL);
        INSERT INTO event VALUES (1, 'Stará štafeta', 'stara', NULL, '2025-05-01', NULL, 60, 'finished', '2025-01-01 00:00:00');
        CREATE TABLE team (id INTEGER PRIMARY KEY, name VARCHAR NOT NULL, contact_name VARCHAR NOT NULL, contact_email VARCHAR NOT NULL,
            contact_phone VARCHAR, members VARCHAR, note VARCHAR, event_id INTEGER NOT NULL, status VARCHAR(8) NOT NULL, created_at DATETIME NOT NULL);
        INSERT INTO team VALUES (1, 'Veteráni', 'Petr', 'p@x.cz', NULL, '1. Petr', NULL, 1, 'approved', '2025-01-02 00:00:00');
    """)
    con.commit(); con.close()
    from tests.conftest import make_client
    with make_client(db) as c:
        ev = c.get("/api/events/stara").json()
        assert ev["require_approval"] is True and ev["team_count"] == 1
        assert c.get("/api/events/1/entries").json()[0]["name"] == "Veteráni"
