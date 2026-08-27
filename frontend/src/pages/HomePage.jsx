import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Card, Badge } from "../components/ui";
import { formatDate, STATUS_LABELS } from "../lib/format";

const STATUS_TONE = { open: "leaf", closed: "gold", finished: "neutral" };

export default function HomePage() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listEvents().then(setEvents).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl font-extrabold uppercase tracking-tight text-forest-900">
          Nadcházející a proběhlé štafety
        </h1>
        <p className="text-forest-700/70 mt-2 max-w-xl">
          Mapa, buzola a v cíli zasloužené pivo. Vyber si závod, přihlas tým nebo se podívej na výsledky.
        </p>
      </div>

      {error && <p className="text-punch">{error}</p>}
      {events === null && !error && <p className="text-forest-700/60">Načítám závody…</p>}
      {events && events.length === 0 && (
        <Card className="p-8 text-center text-forest-700/60">Zatím tu žádný závod není. Zkus to později.</Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {events?.map((ev) => (
          <Link key={ev.id} to={`/zavody/${ev.slug}`}>
            <Card className="p-5 h-full hover:border-gold hover:shadow-md transition-all flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-2xl font-bold uppercase leading-tight">{ev.name}</h2>
                <Badge tone={STATUS_TONE[ev.status] || "neutral"}>{STATUS_LABELS[ev.status]}</Badge>
              </div>
              {ev.event_date && (
                <p className="text-sm font-mono text-wood">{formatDate(ev.event_date)}</p>
              )}
              {ev.location && <p className="text-sm text-forest-700/70">📍 {ev.location}</p>}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
