import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { hasRole, useAuth } from "../lib/auth";
import { Badge, Card, PageHero, Segmented } from "../components/ui";
import EventCard from "../components/EventCard";
import { TEAM_STATUS_TONE } from "../lib/format";

const FILTERS = [
  { key: "upcoming", label: "Nadcházející" },
  { key: "past", label: "Proběhlé" },
];

const ENTRY_SHORT = { pending: "Čeká", approved: "Schváleno", rejected: "Zamítnuto" };

function SearchBox({ value, onChange, onSubmit }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex items-center gap-2 w-full lg:w-[26rem]"
      role="search"
    >
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Hledat závod nebo místo…"
        aria-label="Hledat závod nebo místo"
        className="flex-1 min-w-0 rounded-xl bg-white/10 border border-white/10 px-4 py-2.5 text-sm text-foam placeholder:text-foam/45 outline-none focus:border-gold focus:bg-white/15"
      />
      <button type="submit" className="rounded-xl bg-gold hover:bg-gold-600 text-forest-900 font-semibold text-sm px-5 py-2.5 transition-colors">
        Hledat
      </button>
    </form>
  );
}

function MyEntriesWidget() {
  const [entries, setEntries] = useState(null);
  useEffect(() => {
    api.myEntries().then(setEntries).catch(() => setEntries([]));
  }, []);
  const upcoming = (entries || []).filter((e) => !e.event_date || new Date(e.event_date + "T23:59:59") >= new Date());

  return (
    <Card className="p-5">
      <h3 className="font-display text-lg font-bold mb-3">Moje přihlášky</h3>
      {entries === null && <p className="text-sm text-forest-700/50">Načítám…</p>}
      {entries && upcoming.length === 0 && (
        <p className="text-sm text-forest-700/60 mb-3">Zatím žádný nadcházející závod. Vyber si z kalendáře.</p>
      )}
      <ul className="divide-y divide-line">
        {upcoming.slice(0, 3).map((e) => (
          <li key={e.id} className="py-2.5 first:pt-0 flex items-start justify-between gap-3">
            <Link to={`/zavody/${e.event_slug}`} className="min-w-0 group">
              <p className="font-semibold text-sm leading-tight truncate group-hover:text-wood">{e.name}</p>
              <p className="text-xs text-forest-700/55 truncate">
                {e.event_name}
                {e.category_name && ` · ${e.category_name}`}
              </p>
            </Link>
            <Badge tone={TEAM_STATUS_TONE[e.status]}>{ENTRY_SHORT[e.status]}</Badge>
          </li>
        ))}
      </ul>
      <Link
        to="/moje-prihlasky"
        className="mt-3 flex justify-center rounded-xl bg-forest-900 hover:bg-forest-700 text-foam text-sm font-semibold py-2.5 transition-colors"
      >
        {upcoming.length > 3 ? `Všechny přihlášky (${upcoming.length})` : "Spravovat přihlášky"}
      </Link>
    </Card>
  );
}

function LoginWidget() {
  return (
    <Card className="p-5">
      <h3 className="font-display text-lg font-bold mb-1">Moje přihlášky</h3>
      <p className="text-sm text-forest-700/60 mb-3">Přihlas se a tým zapíšeš za pár minut – sestavu můžeš upravovat až do uzávěrky.</p>
      <div className="flex gap-2">
        <Link to="/prihlaseni" className="flex-1 text-center rounded-xl bg-forest-900 hover:bg-forest-700 text-foam text-sm font-semibold py-2.5">
          Přihlásit se
        </Link>
        <Link to="/registrace" className="flex-1 text-center rounded-xl border border-line hover:border-forest-900 text-sm font-semibold py-2.5">
          Registrace
        </Link>
      </div>
    </Card>
  );
}

function FreshResultsWidget() {
  const [events, setEvents] = useState(null);
  useEffect(() => {
    api
      .listEvents({ when: "past" })
      .then((evs) => setEvents(evs.filter((e) => e.status === "finished").slice(0, 3)))
      .catch(() => setEvents([]));
  }, []);
  if (!events || events.length === 0) return null;
  return (
    <Card className="p-5">
      <h3 className="font-display text-lg font-bold mb-3">Čerstvé výsledky</h3>
      <ul className="space-y-3">
        {events.map((ev) => (
          <li key={ev.id}>
            <p className="font-semibold text-sm leading-tight">{ev.name}</p>
            <p className="text-xs text-forest-700/55 mb-1">
              Vyhodnoceno · {ev.team_count} týmů{ev.location ? ` · ${ev.location}` : ""}
            </p>
            <Link to={`/zavody/${ev.slug}`} className="text-xs font-semibold underline underline-offset-2 hover:text-wood">
              Zobrazit výsledkovou listinu →
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function OrganizerWidget({ user }) {
  const to = hasRole(user, "organizer") ? "/admin" : user ? "/ucet#poradani" : "/registrace";
  const label = hasRole(user, "organizer") ? "Správa závodů" : "Začít pořádat";
  return (
    <div className="rounded-2xl bg-gold p-5 text-forest-900">
      <h3 className="font-display text-lg font-extrabold mb-1">Pořádáš štafetu?</h3>
      <p className="text-sm text-forest-900/75 mb-4">
        Přihlášky, sestavy i výsledky na jednom místě – bez tabulek a e-mailů.
      </p>
      <Link to={to} className="inline-flex rounded-xl bg-forest-900 hover:bg-forest-700 text-foam text-sm font-semibold px-4 py-2 transition-colors">
        {label}
      </Link>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [events, setEvents] = useState(null);
  const [error, setError] = useState("");
  const [when, setWhen] = useState("upcoming");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQuery(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    api.listEvents({ when, q: query }).then(setEvents).catch((e) => setError(e.message));
  }, [when, query]);

  return (
    <div>
      <PageHero
        overlap
        eyebrow="Přihlášky · pořádání · výsledky"
        title="Kalendář"
        subtitle="Najdi závod, slož sestavu po úsecích a přihlas tým za pár minut."
        aside={<SearchBox value={q} onChange={setQ} onSubmit={() => setQuery(q)} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem] gap-6 items-start">
        <div className="min-w-0">
          <Segmented
            options={FILTERS}
            value={when}
            onChange={(k) => {
              setWhen(k);
              setEvents(null);
            }}
            className="mb-4"
          />

          {error && <p className="text-punch">{error}</p>}
          {events === null && !error && <p className="text-forest-700/60 py-6">Načítám závody…</p>}
          {events && events.length === 0 && (
            <Card className="p-10 text-center text-forest-700/60">
              {query ? `Nic jsme nenašli pro „${query}“.` : "Žádný závod tu zatím není."}
            </Card>
          )}

          <div className="grid grid-cols-1 gap-3">
            {events?.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        </div>

        <aside className="grid grid-cols-1 gap-4">
          {user ? <MyEntriesWidget /> : <LoginWidget />}
          <FreshResultsWidget />
          <OrganizerWidget user={user} />
        </aside>
      </div>
    </div>
  );
}
