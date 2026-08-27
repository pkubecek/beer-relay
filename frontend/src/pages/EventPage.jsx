import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Card, Badge } from "../components/ui";
import { formatDate, STATUS_LABELS } from "../lib/format";
import TeamRegistrationForm from "../components/TeamRegistrationForm";
import ResultsTable from "../components/ResultsTable";
import RouteLine from "../components/RouteLine";

const STATUS_TONE = { open: "leaf", closed: "gold", finished: "neutral" };
const TABS = [
  { key: "info", label: "Info a přihláška" },
  { key: "results", label: "Výsledky" },
];

export default function EventPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [legs, setLegs] = useState([]);
  const [teams, setTeams] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);
  const [tab, setTab] = useState("info");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getEvent(slug)
      .then((ev) => {
        setEvent(ev);
        return Promise.all([api.listLegs(ev.id), api.listApprovedTeams(ev.id)]);
      })
      .then(([legsData, teamsData]) => {
        setLegs(legsData);
        setTeams(teamsData);
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

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h1 className="font-display text-4xl md:text-5xl font-extrabold uppercase tracking-tight">{event.name}</h1>
          <Badge tone={STATUS_TONE[event.status]}>{STATUS_LABELS[event.status]}</Badge>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-forest-700/70 font-mono">
          {event.event_date && <span>📅 {formatDate(event.event_date)}</span>}
          {event.location && <span>📍 {event.location}</span>}
        </div>
        {event.description && <p className="mt-3 text-forest-700/90 max-w-2xl">{event.description}</p>}
      </div>

      <div className="flex gap-1 border-b border-wood/20 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
              tab === t.key
                ? "border-b-2 border-gold text-forest-900"
                : "text-forest-700/50 hover:text-forest-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="font-display text-xl font-bold uppercase mb-3">Úseky štafety</h2>
            {legs.length === 0 ? (
              <p className="text-forest-700/60 text-sm">Úseky ještě nejsou zveřejněné.</p>
            ) : (
              <RouteLine
                legs={legs}
                renderLeg={(leg) => (
                  <div>
                    <p className="font-semibold text-sm">{leg.name}</p>
                    {leg.description && <p className="text-xs text-forest-700/60">{leg.description}</p>}
                  </div>
                )}
              />
            )}

            <h2 className="font-display text-xl font-bold uppercase mt-8 mb-3">Přihlášené týmy ({teams.length})</h2>
            {teams.length === 0 ? (
              <p className="text-forest-700/60 text-sm">Zatím nikdo schválený.</p>
            ) : (
              <ul className="space-y-1">
                {teams.map((t) => (
                  <li key={t.id} className="text-sm border-b border-wood/10 py-1.5">
                    {t.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="font-display text-xl font-bold uppercase mb-3">Přihláška týmu</h2>
            {event.status === "open" ? (
              <Card className="p-5">
                <TeamRegistrationForm eventId={event.id} onRegistered={() => api.listApprovedTeams(event.id).then(setTeams)} />
              </Card>
            ) : (
              <Card className="p-5 text-forest-700/60 text-sm">
                Registrace do tohoto závodu momentálně není otevřená.
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === "results" && (
        <Card className="p-5">
          <ResultsTable data={leaderboard} />
        </Card>
      )}
    </div>
  );
}
