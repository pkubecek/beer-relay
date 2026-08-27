# Pivní štafety

Webová appka pro přihlašování, pořádání a výsledky pivních štafet v orientačním
běhu. Backend v FastAPI, frontend v Reactu (Vite + Tailwind) — stejný stack
jako OMapMaker, připraveno na Railway (backend) + Vercel (frontend).

## Jak to funguje

- **Veřejná stránka** — seznam závodů, detail závodu s úseky štafety,
  registrační formulář týmu a živě přepočítávaná výsledková listina.
- **Administrace** (`/admin`, heslo v `ADMIN_PASSWORD`) — zakládání závodů,
  správa úseků, schvalování/zamítání přihlášených týmů, zadávání časů a
  trestných bodů po úsecích.
- **Výsledek týmu** = součet časů na úsecích + (trestné body × sekundy za bod,
  nastavitelné na úrovni závodu). Týmy s DNF na libovolném úseku se řadí za
  všechny, kdo dojeli.
- Appka je stavěná jako **opakovaně použitelná platforma** — jde založit
  libovolný počet závodů/ročníků, každý má vlastní stav (koncept → registrace
  otevřena → uzavřena → vyhodnoceno).

## Struktura projektu

```
backend/   FastAPI + SQLModel (SQLite lokálně, Postgres na Railway)
frontend/  React + Vite + Tailwind
```

## Lokální spuštění

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # uprav ADMIN_PASSWORD a SECRET_KEY
uvicorn app.main:app --reload
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

## Nasazení (stejně jako OMapMaker)

### Backend na Railway

1. Nový projekt → Deploy from GitHub repo → adresář `backend/`.
2. Přidej Postgres plugin — Railway automaticky nastaví `DATABASE_URL`.
3. Nastav proměnné prostředí: `ADMIN_PASSWORD`, `SECRET_KEY` (náhodný
   dlouhý řetězec), `ALLOWED_ORIGINS` (URL tvého Vercel frontendu).
4. Start command se bere z `Procfile`.

### Frontend na Vercel

1. Import repa, root adresář `frontend/`.
2. Framework preset: Vite.
3. Nastav proměnnou prostředí `VITE_API_URL` na URL backendu na Railway.
4. `vercel.json` už obsahuje SPA rewrite, takže fungují i přímé odkazy na
   `/zavody/nazev-zavodu`.

## Bezpečnostní poznámka

Admin přihlášení je jednoduché — jedno sdílené heslo pro všechny pořadatele
(žádná jednotlivá konta). Pro pár lidí, kteří spolu organizují štafety, to
stačí; pokud budeš chtít víc rolí nebo víc oddělených účtů, dá se to snadno
rozšířit.
