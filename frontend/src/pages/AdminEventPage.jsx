import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { Badge } from "../components/ui";
import { EVENT_STATUS_TONE, STATUS_LABELS } from "../lib/format";
import EventSettings from "../components/admin/EventSettings";
import CategoriesManager from "../components/admin/CategoriesManager";
import LegsManager from "../components/admin/LegsManager";
import TeamsManager from "../components/admin/TeamsManager";
import ResultsEntry from "../components/admin/ResultsEntry";

const SECTIONS = [
  { key: "settings", label: "Nastavení" },
  { key: "categories", label: "Kategorie" },
  { key: "legs", label: "Úseky" },
  { key: "teams", label: "Přihlášky" },
  { key: "results", label: "Výsledky" },
];

export default function AdminEventPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [legs, setLegs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [teams, setTeams] = useState([]);
  const [section, setSection] = useState("teams");
  const [error, setError] = useState("");

  const loadAll = useCallback(() => {
    api
      .getEvent(slug)
      .then(async (ev) => {
        if (!ev.can_manage) throw new Error("Tento závod nespravuješ.");
        const [l, c, t] = await Promise.all([
          api.listLegs(ev.id),
          api.listCategories(ev.id),
          api.listEntriesManage(ev.id),
        ]);
        setEvent(ev);
        setLegs(l);
        setCategories(c);
        setTeams(t);
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  useEffect(loadAll, [loadAll]);

  if (error) return <p className="text-punch">{error}</p>;
  if (!event) return <p className="text-forest-700/60">Načítám…</p>;

  const approvedTeams = teams.filter((t) => t.status === "approved");

  return (
    <div>
      <Link to="/admin" className="text-sm text-wood hover:underline">← Zpět na přehled</Link>
      <div className="flex items-center justify-between gap-3 flex-wrap mt-2 mb-6">
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight">{event.name}</h1>
        <div className="flex items-center gap-2">
          <Badge tone={EVENT_STATUS_TONE[event.status]}>{STATUS_LABELS[event.status]}</Badge>
          {event.status !== "draft" && (
            <Link to={`/zavody/${event.slug}`} className="text-sm text-wood hover:underline">Veřejná stránka ↗</Link>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-wood/20 mb-6 overflow-x-auto">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide whitespace-nowrap transition-colors ${
              section === s.key ? "border-b-2 border-gold text-forest-900" : "text-forest-700/50 hover:text-forest-900"
            }`}
          >
            {s.label}
            {s.key === "teams" && ` (${teams.length})`}
          </button>
        ))}
      </div>

      {section === "settings" && <EventSettings key={event.id} event={event} onSaved={(ev) => setEvent(ev)} />}
      {section === "categories" && <CategoriesManager eventId={event.id} categories={categories} onChange={loadAll} />}
      {section === "legs" && <LegsManager eventId={event.id} legs={legs} onChange={loadAll} />}
      {section === "teams" && (
        <TeamsManager event={event} teams={teams} legs={legs} categories={categories} onChange={loadAll} />
      )}
      {section === "results" && (
        <ResultsEntry event={event} approvedTeams={approvedTeams} categories={categories} onSaved={setTeams} />
      )}
    </div>
  );
}
