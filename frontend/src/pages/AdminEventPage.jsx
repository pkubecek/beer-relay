import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { Badge, Button, Card, Input, Label, Select } from "../components/ui";
import { STATUS_LABELS } from "../lib/format";
import LegsManager from "../components/admin/LegsManager";
import TeamsManager from "../components/admin/TeamsManager";
import ResultsEntry from "../components/admin/ResultsEntry";

const SECTIONS = [
  { key: "settings", label: "Nastavení" },
  { key: "legs", label: "Úseky" },
  { key: "teams", label: "Týmy" },
  { key: "results", label: "Výsledky" },
];

export default function AdminEventPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [legs, setLegs] = useState([]);
  const [teams, setTeams] = useState([]);
  const [results, setResults] = useState([]);
  const [section, setSection] = useState("settings");
  const [error, setError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const loadAll = useCallback(() => {
    api
      .getEventAdmin(slug)
      .then((ev) => {
        setEvent(ev);
        return Promise.all([
          api.listLegs(ev.id),
          api.listAllTeamsAdmin(ev.id),
          api.getLeaderboard(ev.id).catch(() => null),
        ]);
      })
      .then(([legsData, teamsData]) => {
        setLegs(legsData);
        setTeams(teamsData);
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  useEffect(loadAll, [loadAll]);

  // separately load raw results for entry form (with unrecorded legs included via admin endpoint)
  const loadResults = useCallback(() => {
    if (!event) return;
    api.getAllResultsAdmin(event.id).then(setResults).catch(() => {});
  }, [event]);

  useEffect(loadResults, [loadResults]);

  async function saveSettings(patch) {
    setSavingSettings(true);
    try {
      const updated = await api.updateEvent(event.id, patch);
      setEvent(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingSettings(false);
    }
  }

  if (error) return <p className="text-punch">{error}</p>;
  if (!event) return <p className="text-forest-700/60">Načítám…</p>;

  const approvedTeams = teams.filter((t) => t.status === "approved");

  return (
    <div>
      <Link to="/admin" className="text-sm text-wood hover:underline">
        ← Zpět na přehled
      </Link>
      <div className="flex items-center justify-between gap-3 flex-wrap mt-2 mb-6">
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight">{event.name}</h1>
        <div className="flex items-center gap-2">
          <Badge tone="gold">{STATUS_LABELS[event.status]}</Badge>
          <Link to={`/zavody/${event.slug}`} className="text-sm text-wood hover:underline">
            Zobrazit veřejnou stránku ↗
          </Link>
        </div>
      </div>

      <div className="flex gap-1 border-b border-wood/20 mb-6 flex-wrap">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
              section === s.key ? "border-b-2 border-gold text-forest-900" : "text-forest-700/50 hover:text-forest-900"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "settings" && (
        <Card className="p-5 max-w-lg space-y-4">
          <div>
            <Label>Stav závodu</Label>
            <Select value={event.status} onChange={(e) => saveSettings({ status: e.target.value })}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <p className="text-xs text-forest-700/50 mt-1">
              „Registrace otevřena" zpřístupní přihlašovací formulář veřejně.
            </p>
          </div>
          <div>
            <Label>Penalta (sekund za 1 trestný bod)</Label>
            <Input
              type="number"
              min={0}
              defaultValue={event.penalty_seconds_per_point}
              onBlur={(e) => saveSettings({ penalty_seconds_per_point: Number(e.target.value) })}
            />
          </div>
          {savingSettings && <p className="text-xs text-forest-700/50">Ukládám…</p>}
        </Card>
      )}

      {section === "legs" && <LegsManager eventId={event.id} legs={legs} onChange={loadAll} />}

      {section === "teams" && <TeamsManager teams={teams} onChange={loadAll} />}

      {section === "results" && (
        <ResultsEntry
          approvedTeams={approvedTeams}
          legs={legs}
          results={results}
          onChange={loadResults}
        />
      )}
    </div>
  );
}
