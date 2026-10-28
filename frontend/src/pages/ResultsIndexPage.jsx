import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card, PageHero, Segmented } from "../components/ui";
import EventCard from "../components/EventCard";

/** Přehled vyhodnocených závodů – vstup do oficiálních výsledkových listin. */
export default function ResultsIndexPage() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState("");
  const [year, setYear] = useState("all");

  useEffect(() => {
    api
      .listEvents({ when: "all" })
      .then((evs) => setEvents(evs.filter((e) => e.status === "finished")))
      .catch((e) => setError(e.message));
  }, []);

  const years = Array.from(new Set((events || []).map((e) => e.event_date?.slice(0, 4)).filter(Boolean))).sort().reverse();
  const shown = (events || []).filter((e) => year === "all" || e.event_date?.startsWith(year));

  return (
    <div>
      <PageHero
        overlap
        eyebrow="Oficiální výsledkové listiny"
        title="Výsledky"
        subtitle="Pořadí týmů po kategoriích ze všech vyhodnocených pivních štafet."
      />
      <Segmented
        options={[{ key: "all", label: "Vše" }, ...years.map((y) => ({ key: y, label: y }))]}
        value={year}
        onChange={setYear}
        className="mb-4"
      />
      {error && <p className="text-punch">{error}</p>}
      {events === null && !error && <p className="text-forest-700/60 py-6">Načítám…</p>}
      {events && shown.length === 0 && (
        <Card className="p-10 text-center text-forest-700/60">Zatím tu nejsou žádné vyhodnocené závody.</Card>
      )}
      <div className="grid grid-cols-1 gap-3 max-w-4xl">
        {shown.map((ev) => (
          <EventCard key={ev.id} event={ev} />
        ))}
      </div>
    </div>
  );
}
