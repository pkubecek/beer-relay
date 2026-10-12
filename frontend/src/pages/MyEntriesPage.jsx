import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Badge, Button, Card } from "../components/ui";
import { formatDate, TEAM_STATUS_LABELS, TEAM_STATUS_TONE } from "../lib/format";

export default function MyEntriesPage() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.myEntries().then(setEntries).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight mb-6">Moje přihlášky</h1>
      {error && <p className="text-punch">{error}</p>}
      {entries === null && !error && <p className="text-forest-700/60">Načítám…</p>}
      {entries?.length === 0 && (
        <Card className="p-8 text-center text-forest-700/60">
          Zatím nejsi v žádném týmu. <Link to="/" className="text-wood font-semibold hover:underline">Vyber si závod</Link>.
        </Card>
      )}
      <div className="grid gap-3">
        {entries?.map((e) => (
          <Card key={e.id} className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <Link to={`/zavody/${e.event_slug}`} className="text-xs font-mono uppercase text-wood hover:underline">
                  {e.event_name} {e.event_date && `· ${formatDate(e.event_date)}`}
                </Link>
                <p className="font-display text-2xl font-bold uppercase leading-tight">
                  {e.start_number != null && <span className="text-wood font-mono text-lg mr-2">#{e.start_number}</span>}
                  {e.name}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge tone={TEAM_STATUS_TONE[e.status]}>{TEAM_STATUS_LABELS[e.status]}</Badge>
                  {e.category_name && <Badge>{e.category_name}</Badge>}
                  <Badge tone={e.paid ? "leaf" : "neutral"}>{e.paid ? "Zaplaceno" : "Nezaplaceno"}</Badge>
                  {e.is_captain ? <Badge tone="gold">Kapitán</Badge> : <span className="text-xs text-forest-700/60">kapitán: {e.contact_name}</span>}
                </div>
                {e.members.length > 0 && (
                  <p className="text-xs text-forest-700/70 mt-2">{e.members.map((m) => m.name).join(" → ")}</p>
                )}
              </div>
              {e.can_edit && (
                <Link to={`/zavody/${e.event_slug}/prihlaska/${e.id}`}>
                  <Button variant="outline">Upravit</Button>
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
