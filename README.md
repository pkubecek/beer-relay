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

