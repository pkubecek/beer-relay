# Pivní štafety

Webová appka pro přihlašování, pořádání a výsledky pivních štafet v orientačním
běhu – inspirovaná [ORISem](https://oris.ceskyorientak.cz/). Backend v FastAPI,
frontend v Reactu (Vite + Tailwind), připraveno na Railway (backend) + Vercel (frontend).

## Co umí

**Účty a role**
- Registrace e-mailem a heslem, přihlášení (JWT), profil (jméno, ročník, oddíl, telefon), změna hesla.
- Role **závodník** (přihlašuje týmy), **pořadatel** (zakládá a spravuje své závody) a **admin**
  (vše + správa uživatelů, přidělování rolí, reset hesla, blokace účtu).
- První admin: jeho e-mail dej do `ADMIN_EMAILS` – po registraci/přihlášení dostane roli admin.

**Kalendář závodů**
- Nadcházející / proběhlé / vše, hledání podle názvu a místa.
- Detail závodu: datum a čas startu, místo, pořadatel, kontakt, web, termíny přihlášek,
  startovné, kapacita, kategorie, úseky štafety a mapa místa (výběr bodu z mapy OSM, hledání přes Nominatim).

**Přihlášky**
- Přihlášku podává přihlášený uživatel (kapitán): název týmu, oddíl, kategorie, telefon
  a sestava po úsecích (jméno + nepovinný e-mail).
- Když má člen sestavy účet se stejným e-mailem (nebo si ho založí později), uvidí tým v **Moje přihlášky**.
- Kapitán může přihlášku upravit nebo zrušit až do uzávěrky. Po uzávěrce už jen pořadatel.
- Přihlašovat jde, jen když je závod ve stavu „Přihlášky otevřeny“, jsme mezi
  „Přihlášky od“ a „Uzávěrka“ a není naplněná kapacita (celková ani kategorie).
- Veřejný seznam přihlášených po kategoriích (bez e-mailů a telefonů).

**Správa závodu (pořadatel)**
- Nastavení závodu, kategorie (s volitelnou kapacitou), úseky.
- Přihlášky: schválení/zamítnutí (nebo automatické schválení), zaplaceno, kategorie,
  startovní čísla (ručně nebo hromadně po kategoriích), dohláška po uzávěrce, export CSV (pro Excel).
- Výsledky: ke každé štafetě pořadí (v kategorii), nepovinně čas, DNF.

**Výsledky**
- Pořadí zadává pořadatel ručně, čas je jen informativní.
- Výsledková listina po kategoriích, DNF na konci.

## Struktura projektu

```
backend/   FastAPI + SQLModel (SQLite)
  app/models.py       datový model
  app/auth.py         hesla (bcrypt), JWT, role a oprávnění
  app/services.py     stav přihlášek, převody na API schémata
  app/routers/        auth, users, events, teams (přihlášky), results
  tests/              pytest scénáře
frontend/  React + Vite + Tailwind
  src/lib/auth.jsx    přihlášený uživatel (AuthProvider, RequireAuth)
  src/pages/          kalendář, detail závodu, přihláška, účet, správa
```

## Lokální spuštění

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env        # nastav SECRET_KEY a ADMIN_EMAILS
uvicorn app.main:app --reload
pytest                      # testy
```

Běží na `http://localhost:8000`, dokumentace API na `/docs`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_URL ukazuje na backend
npm run dev
```

Běží na `http://localhost:5173`.

## Databáze a přechod z verze 1

Používá se SQLite. Při startu backend vytvoří chybějící tabulky a do existujících
**doplní nové sloupce** (jednoduchá vestavěná migrace), takže stará `beerrelay.db`
zůstane zachovaná. Staré týmy bez kapitána fungují dál – jejich volný text se
členy se v administraci zobrazuje u přihlášky.

Staré sdílené heslo `ADMIN_PASSWORD` už se nepoužívá – správa jde přes účty a role.

## Nasazení

### Backend na Railway

1. Nový projekt → Deploy from GitHub repo → adresář `backend/`.
2. **Přidej Volume** a připoj ho např. na `/data` (jinak se SQLite při každém deployi smaže).
3. Proměnné prostředí:
   - `DATABASE_URL=sqlite:////data/beerrelay.db`
   - `SECRET_KEY` – náhodný dlouhý řetězec
   - `ADMIN_EMAILS` – tvůj e-mail
   - `ALLOWED_ORIGINS` – URL frontendu na Vercelu
4. Start command se bere z `Procfile`. Kvůli SQLite nech běžet jen jednu repliku.

### Frontend na Vercel

1. Import repa, root adresář `frontend/`, preset Vite.
2. Proměnná `VITE_API_URL` = URL backendu na Railway.
3. `vercel.json` obsahuje SPA rewrite, fungují i přímé odkazy.

## Co zatím chybí (nápady na další verzi)

- E-maily (potvrzení přihlášky, zapomenuté heslo) – zatím heslo resetuje admin.
- Více pořadatelů na jeden závod (teď jeden pořadatel + admin).
- Rozdílné startovné po 1./2. uzávěrce, platby přes QR kód.
- Startovka v PDF, import výsledků z čipování.
