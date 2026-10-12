import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Badge, Card, Input } from "../components/ui";
import { EVENT_STATUS_TONE, formatDateTime, STATUS_LABELS } from "../lib/format";

const FILTERS = [
  { key: "upcoming", label: "Nadcházející" },
  { key: "past", label: "Proběhlé" },
  { key: "all", label: "Vše" },
];

function DateBlock({ value }) {
  if (!value) return <div className="w-14 text-center text-xs text-forest-700/50 font-mono">bez data</div>;
  const d = new Date(value + "T00:00:00");
  return (
    <div className="w-14 shrink-0 text-center border-2 border-forest-900 rounded-md overflow-hidden bg-white">
      <div className="bg-forest-900 text-foam text-[10px] font-mono uppercase py-0.5">
        {d.toLocaleDateString("cs-CZ", { month: "short" })}
      </div>
      <div className="font-display text-2xl font-extrabold leading-tight">{d.getDate()}</div>
      <div className="text-[10px] font-mono text-wood pb-0.5">{d.getFullYear()}</div>
    </div>
  );
}

export default function HomePage() {
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
      <div className="mb-6">
        <h1 className="font-display text-4xl md:text-5xl font-extrabold uppercase tracking-tight text-forest-900">Kalendář štafet</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex rounded-md border-2 border-forest-900 overflow-hidden">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setWhen(f.key)}
              className={`px-3 py-1.5 text-sm font-semibold ${when === f.key ? "bg-forest-900 text-foam" : "bg-white hover:bg-forest-50"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[180px] max-w-xs">
          <Input placeholder="Hledat závod nebo místo…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {error && <p className="text-punch">{error}</p>}
      {events === null && !error && <p className="text-forest-700/60">Načítám závody…</p>}
      {events && events.length === 0 && (
        <Card className="p-8 text-center text-forest-700/60">Žádný závod tu zatím není.</Card>
      )}

      <div className="grid gap-3">
        {events?.map((ev) => (
          <Link key={ev.id} to={`/zavody/${ev.slug}`}>
            <Card className="p-4 hover:border-gold hover:shadow-md transition-all flex items-center gap-4">
              <DateBlock value={ev.event_date} />
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase leading-tight truncate">{ev.name}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-forest-700/70 mt-1">
                  {ev.location && <span>📍 {ev.location}</span>}
                  {ev.organizer_name && <span>🧭 {ev.organizer_name}</span>}
                  <span>🍻 {ev.team_count}{ev.max_teams ? ` / ${ev.max_teams}` : ""} týmů</span>
                  {ev.registration_open && ev.entry_deadline && (
                    <span className="text-wood font-medium">⏰ uzávěrka {formatDateTime(ev.entry_deadline)}</span>
                  )}
                </div>
              </div>
              <div className="shrink-0 hidden sm:block">
                {ev.registration_open ? (
                  <Badge tone="leaf">Přihlášky otevřeny</Badge>
                ) : (
                  <Badge tone={EVENT_STATUS_TONE[ev.status]}>
                    {ev.status === "open" ? "Přihlášky zavřeny" : STATUS_LABELS[ev.status]}
                  </Badge>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
