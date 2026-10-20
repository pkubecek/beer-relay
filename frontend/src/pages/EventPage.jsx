import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Badge, Button, Card } from "../components/ui";
import { EVENT_STATUS_TONE, formatDate, formatDateTime, formatMoney, STATUS_LABELS, legLabel } from "../lib/format";
import EntriesList from "../components/EntriesList";
import ResultsTable from "../components/ResultsTable";
import RouteLine from "../components/RouteLine";
import { EventMap } from "../components/Map";

function Fact({ label, children }) {
  if (!children) return null;
  return (
    <div className="flex gap-3 py-1.5 border-b border-wood/10 text-sm">
      <dt className="w-36 shrink-0 text-xs uppercase tracking-wide font-semibold text-wood pt-0.5">{label}</dt>
      <dd className="flex-1">{children}</dd>
    </div>
  );
}

function EntryCallToAction({ event }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!event.registration_open) {
    return (
      <Card className="p-5 text-sm text-forest-700/70">
        {event.registration_message || "Přihlášky nejsou otevřené."}
      </Card>
    );
  }
  return (
    <Card className="p-5 bg-gold/10 border-gold">
      <p className="font-display text-xl font-bold uppercase mb-1">Přihlášky jsou otevřené</p>
      {event.entry_deadline && (
        <p className="text-sm mb-3">Uzávěrka: <strong>{formatDateTime(event.entry_deadline)}</strong></p>
      )}
      {user ? (
        <Link to={`/zavody/${event.slug}/prihlaska`}>
          <Button>Přihlásit tým</Button>
        </Link>
      ) : (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link to={`/prihlaseni?next=${encodeURIComponent(location.pathname + "/prihlaska")}`}>
            <Button>Přihlásit se a přihlásit tým</Button>
          </Link>
          <Link to={`/registrace?next=${encodeURIComponent(location.pathname + "/prihlaska")}`} className="text-wood font-semibold hover:underline">
            nebo si založ účet
          </Link>
        </div>
      )}
    </Card>
  );
}

export default function EventPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [legs, setLegs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [entries, setEntries] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);
  const [tab, setTab] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getEvent(slug)
      .then((ev) => {
        setEvent(ev);
        setTab((t) => t ?? (ev.status === "finished" ? "results" : "info"));
        return Promise.all([api.listLegs(ev.id), api.listCategories(ev.id), api.listEntries(ev.id)]);
      })
      .then(([legsData, catsData, entriesData]) => {
        setLegs(legsData);
        setCategories(catsData);
        setEntries(entriesData);
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  useEffect(() => {
    if (tab === "results" && event) {
      api.getLeaderboard(event.id).then(setLeaderboard).catch((e) => setError(e.message));
    }
  }, [tab, event]);

  if (error) return <p className="text-punch">{error}</p>;
  if (!event) return <p className="text-forest-700/60">Načítám…</p>;

  const tabs = [
    { key: "info", label: "Informace" },
    { key: "entries", label: `Přihlášky (${entries.length})` },
    { key: "results", label: "Výsledky" },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h1 className="font-display text-4xl md:text-5xl font-extrabold uppercase tracking-tight">{event.name}</h1>
          <div className="flex items-center gap-2">
            <Badge tone={EVENT_STATUS_TONE[event.status]}>{STATUS_LABELS[event.status]}</Badge>
            {event.can_manage && (
              <Link to={`/admin/zavody/${event.slug}`} className="text-sm text-wood hover:underline">Spravovat ↗</Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-forest-700/70 font-mono">
          {event.event_date && <span>📅 {formatDate(event.event_date)}{event.start_time && `, ${event.start_time}`}</span>}
          {event.location && <span>📍 {event.location}</span>}
        </div>
      </div>

      <div className="flex gap-1 border-b border-wood/20 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide whitespace-nowrap transition-colors ${
              tab === t.key ? "border-b-2 border-gold text-forest-900" : "text-forest-700/50 hover:text-forest-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-3 space-y-6">
            <EntryCallToAction event={event} />
            {event.description && <p className="text-forest-700/90 whitespace-pre-line">{event.description}</p>}
            <dl>
              <Fact label="Datum">{event.event_date && `${formatDate(event.event_date)}${event.start_time ? `, start ${event.start_time}` : ""}`}</Fact>
              <Fact label="Místo">{event.location}</Fact>
              <Fact label="Pořadatel">{event.organizer_name}</Fact>
              <Fact label="Kontakt">{event.contact_email && <a className="text-wood hover:underline" href={`mailto:${event.contact_email}`}>{event.contact_email}</a>}</Fact>
              <Fact label="Web">{event.website && <a className="text-wood hover:underline break-all" href={event.website} target="_blank" rel="noreferrer">{event.website}</a>}</Fact>
              <Fact label="Přihlášky od">{event.entries_open_at && formatDateTime(event.entries_open_at)}</Fact>
              <Fact label="Uzávěrka">{event.entry_deadline && formatDateTime(event.entry_deadline)}</Fact>
              <Fact label="Startovné">{event.entry_fee != null && `${formatMoney(event.entry_fee)} za tým`}</Fact>
              <Fact label="Kapacita">{`${event.team_count}${event.max_teams ? ` / ${event.max_teams}` : ""} týmů`}</Fact>
              <Fact label="Kategorie">{categories.length > 0 && categories.map((c) => c.name).join(", ")}</Fact>
            </dl>
          </div>
          <div className="md:col-span-2">
            {event.lat != null && event.lon != null && (
              <div className="mb-8">
                <h2 className="font-display text-xl font-bold uppercase mb-3">Místo</h2>
                <EventMap lat={event.lat} lon={event.lon} label={event.location} />
              </div>
            )}
            <h2 className="font-display text-xl font-bold uppercase mb-3">Úseky štafety</h2>
            {legs.length === 0 ? (
              <p className="text-forest-700/60 text-sm">Úseky ještě nejsou zveřejněné.</p>
            ) : (
              <RouteLine
                legs={legs}
                renderLeg={(leg) => (
                  <div>
                    <p className="font-semibold text-sm">{legLabel(leg)}</p>
                    {leg.description && <p className="text-xs text-forest-700/60">{leg.description}</p>}
                  </div>
                )}
              />
            )}
          </div>
        </div>
      )}

      {tab === "entries" && (
        <Card className="p-5">
          <EntriesList teams={entries} legs={legs} categories={categories} />
        </Card>
      )}

      {tab === "results" && (
        <Card className="p-5">
          <ResultsTable data={leaderboard} />
        </Card>
      )}
    </div>
  );
}
