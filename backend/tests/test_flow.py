from datetime import datetime, timedelta

from tests.conftest import register


def make_organizer(client):
    admin_h, _ = register(client, "admin@test.cz", "Ada", "Adminová")
    org_h, org = register(client, "org@test.cz", "Olga", "Pořadatelová")
    r = client.patch(f"/api/users/{org['id']}", json={"role": "organizer"}, headers=admin_h)
    assert r.status_code == 200 and r.json()["role"] == "organizer"
    return admin_h, org_h


def make_event(client, org_h, **extra):
    body = {"name": "Pivní štafeta Říp 2026", "event_date": "2030-05-01", "start_time": "10:00", "location": "Říp",
            "status": "open", "entry_fee": 400, **extra}
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
    r = client.post("/api/auth/me/password", json={"current_password": "tajneheslo", "new_password": "noveheslo1"}, headers=h)
    assert r.status_code == 200 and r.json()["access_token"]
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}  # starý token po změně hesla neplatí
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

    # výsledky – jen pořadí, čas nepovinný
    rows = [{"team_id": team["id"], "place": 1, "finish_time": "1:05:00"}, {"team_id": t2["id"], "place": 1}]
    assert client.put(f"/api/events/{ev['id']}/results", json=rows, headers=cap_h).status_code == 403
    r = client.put(f"/api/events/{ev['id']}/results", json=rows, headers=org_h)
    assert r.status_code == 200, r.text
    assert client.put(f"/api/events/{ev['id']}/results", json=[{"team_id": 99999, "place": 1}], headers=org_h).status_code == 400
    lb = client.get(f"/api/events/{ev['id']}/results").json()
    # seřazeno po kategoriích (Muži, Mix), zamítnutý tým se nezobrazí
    assert [r["team_name"] for r in lb["results"]] == ["Lesní vlci", "Mixíci"]
    assert lb["results"][0]["finish_time"] == "1:05:00" and lb["results"][1]["finish_time"] is None
    assert lb["results"][0]["runners"][1] == "Jana Malá"
    # DNF
    client.put(f"/api/events/{ev['id']}/results", json=[{"team_id": t2["id"], "place": 3, "dnf": True}], headers=org_h)
    lb = client.get(f"/api/events/{ev['id']}/results").json()
    assert lb["results"][1]["dnf"] is True and lb["results"][1]["place"] is None
    mine = client.get("/api/me/entries", headers=cap_h).json()
    assert mine[0]["place"] == 1


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
        assert "penalty_seconds_per_point" not in ev
        # nový závod jde založit i nad starou tabulkou s NOT NULL sloupcem penalizace
        from tests.conftest import register
        h, u = register(c, "admin@test.cz")
        r = c.post("/api/events", json={"name": "Nový", "lat": 50.66, "lon": 14.03}, headers=h)
        assert r.status_code == 201, r.text
        assert r.json()["lat"] == 50.66
        assert c.get("/api/events/1/entries").json()[0]["name"] == "Veteráni"


def test_user_management(client):
    admin_h, admin = register(client, "admin@test.cz", "Ada", "Adminová")
    h, u = register(client, "karel@test.cz", "Karel", "Novák")
    # běžný uživatel nesmí
    assert client.get("/api/users", headers=h).status_code == 403
    assert client.patch(f"/api/users/{u['id']}", json={"role": "organizer"}, headers=h).status_code == 403
    # role: jen závodník / pořadatel
    assert client.patch(f"/api/users/{u['id']}", json={"role": "admin"}, headers=admin_h).status_code == 400
    r = client.patch(f"/api/users/{u['id']}", json={"role": "organizer"}, headers=admin_h)
    assert r.status_code == 200 and r.json()["role"] == "organizer"
    assert client.post("/api/events", json={"name": "Můj závod"}, headers=h).status_code == 201
    users = {x["email"]: x for x in client.get("/api/users", headers=admin_h).json()}
    assert users["karel@test.cz"]["events_count"] == 1 and "password_hash" not in users["karel@test.cz"]
    # zpět na závodníka -> nesmí zakládat
    client.patch(f"/api/users/{u['id']}", json={"role": "user"}, headers=admin_h)
    assert client.post("/api/events", json={"name": "Další"}, headers=h).status_code == 403
    # úprava profilu a e-mailu
    r = client.patch(f"/api/users/{u['id']}", json={"first_name": "Karl", "email": "karl@test.cz", "club": "SK"}, headers=admin_h)
    assert r.json()["email"] == "karl@test.cz" and r.json()["first_name"] == "Karl"
    assert client.patch(f"/api/users/{u['id']}", json={"email": "admin@test.cz"}, headers=admin_h).status_code == 400
    # admina nejde měnit / mazat
    assert client.patch(f"/api/users/{admin['id']}", json={"role": "user"}, headers=admin_h).status_code == 400
    assert client.delete(f"/api/users/{admin['id']}", headers=admin_h).status_code == 400
    # smazání – závod zůstane
    assert client.delete(f"/api/users/{u['id']}", headers=admin_h).status_code == 204
    assert client.post("/api/auth/login", json={"email": "karl@test.cz", "password": "tajneheslo"}).status_code == 401
    assert len(client.get("/api/events/manage", headers=admin_h).json()) == 1


def test_organizer_request(client):
    admin_h, _ = register(client, "admin@test.cz")
    h, u = register(client, "karel@test.cz")
    assert client.get("/api/users/requests/count", headers=admin_h).json()["count"] == 0
    r = client.post("/api/auth/me/organizer-request", json={"note": "Pořádám štafetu na Řípu"}, headers=h)
    assert r.status_code == 200 and r.json()["organizer_request_at"] and r.json()["organizer_request_note"]
    assert client.get("/api/users/requests/count", headers=admin_h).json()["count"] == 1
    assert client.get("/api/users/requests/count", headers=h).status_code == 403
    pending = client.get("/api/users", params={"requests": True}, headers=admin_h).json()
    assert [p["email"] for p in pending] == ["karel@test.cz"]
    # zamítnutí
    client.patch(f"/api/users/{u['id']}", json={"dismiss_request": True}, headers=admin_h)
    assert client.get("/api/users/requests/count", headers=admin_h).json()["count"] == 0
    assert client.get("/api/auth/me", headers=h).json()["role"] == "user"
    # nová žádost a schválení
    client.post("/api/auth/me/organizer-request", json={}, headers=h)
    r = client.patch(f"/api/users/{u['id']}", json={"role": "organizer"}, headers=admin_h)
    assert r.json()["role"] == "organizer" and r.json()["organizer_request_at"] is None
    assert client.post("/api/events", json={"name": "Můj"}, headers=h).status_code == 201
    # pořadatel už žádat nemusí
    assert client.post("/api/auth/me/organizer-request", json={}, headers=h).status_code == 400
    # zrušení vlastní žádosti
    h2, _ = register(client, "jana@test.cz")
    client.post("/api/auth/me/organizer-request", json={}, headers=h2)
    assert client.delete("/api/auth/me/organizer-request", headers=h2).json()["organizer_request_at"] is None


def test_self_delete_account(client):
    admin_h, org_h = make_organizer(client)
    future = make_event(client, org_h)
    past = make_event(client, org_h, name="Loňská štafeta", event_date="2020-05-01")
    legs = client.get(f"/api/events/{future['id']}/legs").json()
    h, me = register(client, "smaz@test.cz", "Sára", "Mazaná")
    r = client.post(f"/api/events/{future['id']}/entries", json={"name": "Budoucí", "members": [{"leg_id": legs[0]["id"], "name": "Sára", "email": "smaz@test.cz"}]}, headers=h)
    assert r.status_code == 201, r.text
    # přihláška na proběhlý závod s výsledkem (vložená rovnou do DB)
    from app.models import Team
    from app.database import get_session
    sess = next(get_session())
    sess.add(Team(event_id=past["id"], name="Loni", captain_id=me["id"], contact_name="Sára", contact_email="smaz@test.cz", place=1))
    sess.commit()

    assert client.request("DELETE", "/api/auth/me", json={"password": "spatne"}, headers=h).status_code == 400
    assert client.request("DELETE", "/api/auth/me", json={"password": "tajneheslo"}, headers=h).status_code == 204
    assert client.post("/api/auth/login", json={"email": "smaz@test.cz", "password": "tajneheslo"}).status_code == 401
    # budoucí přihláška zrušena, minulý výsledek zůstal bez kontaktu
    assert client.get(f"/api/events/{future['id']}/entries").json() == []
    sess.expire_all()
    loni = sess.query(Team).filter(Team.name == "Loni").one()
    assert loni.captain_id is None and loni.contact_email == "" and loni.place == 1
    # admin se smazat nemůže
    assert client.request("DELETE", "/api/auth/me", json={"password": "tajneheslo"}, headers=admin_h).status_code == 400


def test_leg_name_optional(client):
    _, org_h = make_organizer(client)
    ev = make_event(client, org_h)
    r = client.post(f"/api/events/{ev['id']}/legs", json={"order": 4}, headers=org_h)
    assert r.status_code == 201, r.text
    assert r.json()["name"] == ""
    r = client.patch(f"/api/events/legs/{r.json()['id']}", json={"order": 4, "name": "  "}, headers=org_h)
    assert r.status_code == 200 and r.json()["name"] == ""


def test_publish_requirements_and_auto_close(client):
    _, org_h = make_organizer(client)
    # koncept jde založit jen s názvem, zveřejnit ale ne
    r = client.post("/api/events", json={"name": "Koncept"}, headers=org_h)
    assert r.status_code == 201
    ev = r.json()
    r = client.patch(f"/api/events/{ev['id']}", json={"status": "open"}, headers=org_h)
    assert r.status_code == 422 and "místo" in r.json()["detail"] and "čas startu" in r.json()["detail"]
    assert client.post("/api/events", json={"name": "X", "status": "open", "location": "Říp"}, headers=org_h).status_code == 422
    r = client.patch(f"/api/events/{ev['id']}", json={"status": "open", "location": "Říp", "event_date": "2030-01-01", "start_time": "10:00"}, headers=org_h)
    assert r.status_code == 200 and r.json()["status"] == "open"
    # po uzávěrce se přihlášky samy uzavřou
    past = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M")
    r = client.patch(f"/api/events/{ev['id']}", json={"entry_deadline": past}, headers=org_h)
    assert r.json()["status"] == "closed"
    # a i když stav zůstal v DB otevřený (uzávěrka proběhla mezitím), kalendář ho uzavře
    from app.database import get_session
    from app.models import Event
    sess = next(get_session())
    e = sess.get(Event, ev["id"])
    e.status = "open"
    sess.add(e)
    sess.commit()
    assert client.get("/api/events").json()[0]["status"] == "closed"


def test_ranking(client):
    _, org_h = make_organizer(client)
    a_h, a = register(client, "a@test.cz", "Adam", "Rychlý")
    b_h, b = register(client, "b@test.cz", "Bára", "Pomalá")

    def race(name, d, a_place, b_place, **extra):
        ev = make_event(client, org_h, name=name, event_date=d, require_approval=False, **extra)
        leg = client.get(f"/api/events/{ev['id']}/legs").json()[0]
        ta = client.post(f"/api/events/{ev['id']}/entries", json={"name": "A" + name, "members": [{"leg_id": leg["id"], "name": "Adam", "email": "a@test.cz"}]}, headers=a_h).json()
        tb = client.post(f"/api/events/{ev['id']}/entries", json={"name": "B" + name, "members": [{"leg_id": leg["id"], "name": "Bára", "email": "b@test.cz"}]}, headers=b_h).json()
        r = client.put(f"/api/events/{ev['id']}/results", json=[{"team_id": ta["id"], "place": a_place}, {"team_id": tb["id"], "place": b_place}], headers=org_h)
        assert r.status_code == 200, r.text
        return ev

    race("R1", "2030-03-01", 1, 2)   # A 80, B 60
    race("R2", "2030-04-01", 3, 1)   # A 45, B 80
    race("R3", "2030-05-01", 2, 7)   # A 60, B 0
    race("R4", "2030-06-01", 6, 4)   # A 10 (nezapočte), B 30
    fun = race("R5", "2030-07-01", 1, 2, count_in_ranking=False)  # nepočítá se

    data = client.get("/api/ranking?year=2030").json()
    rows = {r["name"]: r for r in data["rows"]}
    assert rows["Adam Rychlý"]["points"] == 80 + 60 + 45
    assert rows["Bára Pomalá"]["points"] == 80 + 60 + 30
    assert data["rows"][0]["name"] == "Adam Rychlý" and data["rows"][0]["rank"] == 1
    assert rows["Adam Rychlý"]["races"] == 4
    assert [r["counted"] for r in rows["Adam Rychlý"]["results"]] == [True, True, True, False]
    assert all(r["event_id"] != fun["id"] for r in rows["Adam Rychlý"]["results"])

    # skrytí z rankingu
    assert client.patch("/api/auth/me", json={"hide_from_ranking": True}, headers=b_h).json()["hide_from_ranking"] is True
    names = [r["name"] for r in client.get("/api/ranking?year=2030").json()["rows"]]
    assert names == ["Adam Rychlý"]


def test_racer_code_links_member(client):
    _, org_h = make_organizer(client)
    ev = make_event(client, org_h)
    legs = client.get(f"/api/events/{ev['id']}/legs").json()
    cap_h, _ = register(client, "kap@test.cz", "Karel", "Kapitán")
    run_h, runner = register(client, "run@test.cz", "Rita", "Běžná")
    code = runner["racer_code"]
    assert len(code) == 6 and code.isdigit()
    # chybný kód
    r = client.post(f"/api/events/{ev['id']}/entries", json={"name": "T", "members": [{"leg_id": legs[0]["id"], "racer_code": "000000" if code != "000000" else "111111"}]}, headers=cap_h)
    assert r.status_code == 422 and "neexistuje" in r.json()["detail"]
    # kód bez jména – jméno se doplní z účtu, mezery se ignorují
    r = client.post(f"/api/events/{ev['id']}/entries", json={"name": "T", "members": [{"leg_id": legs[0]["id"], "racer_code": f" {code[:3]} {code[3:]} "}]}, headers=cap_h)
    assert r.status_code == 201, r.text
    m = r.json()["members"][0]
    assert m["name"] == "Rita Běžná" and m["user_id"] == runner["id"] and m["racer_code"] == code
    assert len(client.get("/api/me/entries", headers=run_h).json()) == 1
    # veřejný seznam kód neukazuje
    assert "racer_code" not in client.get(f"/api/events/{ev['id']}/entries").json()[0]["members"][0]


def test_racer_lookup(client):
    h, _ = register(client, "x@test.cz", "Xaver", "Hledač")
    _, runner = register(client, "r@test.cz", "Rita", "Běžná")
    assert client.get(f"/api/auth/racer/{runner['racer_code']}").status_code in (401, 403)
    r = client.get(f"/api/auth/racer/{runner['racer_code']}", headers=h)
    assert r.status_code == 200 and r.json()["name"] == "Rita Běžná"
    bad = "000000" if runner["racer_code"] != "000000" else "111111"
    assert client.get(f"/api/auth/racer/{bad}", headers=h).status_code == 404


def test_password_change_revokes_old_tokens(client):
    import time
    old_h, _ = register(client, "token@test.cz")
    other_device = {"Authorization": f"Bearer {client.post('/api/auth/login', json={'email': 'token@test.cz', 'password': 'tajneheslo'}).json()['access_token']}"}
    time.sleep(1.1)  # tokeny mají přesnost na sekundy
    r = client.post("/api/auth/me/password", json={"current_password": "tajneheslo", "new_password": "noveheslo1"}, headers=old_h)
    assert r.status_code == 200
    new_h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/api/auth/me", headers=old_h).status_code == 401
    assert client.get("/api/auth/me", headers=other_device).status_code == 401
    assert client.get("/api/auth/me", headers=new_h).status_code == 200


def test_admin_password_reset_revokes_tokens(client):
    import time
    admin_h, _ = register(client, "admin@test.cz")
    h, u = register(client, "reset@test.cz")
    time.sleep(1.1)
    assert client.patch(f"/api/users/{u['id']}", json={"new_password": "resetnute1"}, headers=admin_h).status_code == 200
    assert client.get("/api/auth/me", headers=h).status_code == 401
    assert client.post("/api/auth/login", json={"email": "reset@test.cz", "password": "resetnute1"}).status_code == 200


def test_event_website_must_be_http(client):
    _, org_h = make_organizer(client)
    bad = client.post("/api/events", json={"name": "X", "website": "javascript:alert(1)"}, headers=org_h)
    assert bad.status_code == 422
    ev = client.post("/api/events", json={"name": "Y", "website": "www.stafeta.cz"}, headers=org_h).json()
    assert ev["website"] == "https://www.stafeta.cz"
    assert client.patch(f"/api/events/{ev['id']}", json={"website": "data:text/html,x"}, headers=org_h).status_code == 422
    assert client.patch(f"/api/events/{ev['id']}", json={"website": ""}, headers=org_h).json()["website"] is None


def test_draft_legs_and_categories_hidden(client):
    _, org_h = make_organizer(client)
    ev = client.post("/api/events", json={"name": "Koncept"}, headers=org_h).json()
    client.post(f"/api/events/{ev['id']}/legs", json={"order": 1, "name": "Tajný úsek"}, headers=org_h)
    assert client.get(f"/api/events/{ev['id']}/legs").status_code == 404
    assert client.get(f"/api/events/{ev['id']}/categories").status_code == 404
    assert client.get(f"/api/events/{ev['id']}/legs", headers=org_h).status_code == 200


def test_api_docs_disabled_by_default(client):
    assert client.get("/docs").status_code == 404
    assert client.get("/openapi.json").status_code == 404
