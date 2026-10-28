import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { Badge, PageHero, Segmented } from "../components/ui";
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
      <PageHero
        overlap
        size="md"
        crumbs={[{ label: "Správa závodů", to: "/admin" }, { label: event.name }]}
        badges={<Badge tone={EVENT_STATUS_TONE[event.status]}>{STATUS_LABELS[event.status]}</Badge>}
        title={event.name}
        actions={
          event.status !== "draft" && (
            <Link to={`/zavody/${event.slug}`} className="rounded-xl border border-white/20 hover:border-gold hover:text-gold px-4 py-2 text-sm font-semibold transition-colors">
              Veřejná stránka ↗
            </Link>
          )
        }
      />

      <Segmented
        options={SECTIONS.map((s) => ({ key: s.key, label: s.key === "teams" ? `${s.label} · ${teams.length}` : s.label }))}
        value={section}
        onChange={setSection}
        className="mb-6"
      />


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
