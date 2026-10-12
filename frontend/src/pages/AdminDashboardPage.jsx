import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Button, Card, Badge, Input, Label } from "../components/ui";
import { EVENT_STATUS_TONE, formatDate, STATUS_LABELS } from "../lib/format";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", event_date: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.listManagedEvents().then(setEvents).catch((e) => setError(e.message));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const ev = await api.createEvent({ ...form, event_date: form.event_date || null });
      navigate(`/admin/zavody/${ev.slug}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight">Správa závodů</h1>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Zavřít" : "+ Nový závod"}</Button>
      </div>

      {error && <p className="text-punch mb-4">{error}</p>}

      {showForm && (
        <Card className="p-5 mb-6">
          <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Název závodu</Label>
              <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Datum</Label>
              <Input type="date" value={form.event_date} onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))} />
            </div>
            <div>
              <Label>Místo</Label>
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={submitting}>{submitting ? "Vytvářím…" : "Vytvořit závod"}</Button>
              <span className="text-xs text-forest-700/60">Závod vznikne jako koncept – termíny, startovné a úseky nastavíš v detailu.</span>
            </div>
          </form>
        </Card>
      )}

      {events === null && !error && <p className="text-forest-700/60">Načítám…</p>}
      {events?.length === 0 && <Card className="p-6 text-forest-700/60 text-sm">Zatím nespravuješ žádný závod.</Card>}
      <div className="grid gap-3">
        {events?.map((ev) => (
          <Link key={ev.id} to={`/admin/zavody/${ev.slug}`}>
            <Card className="p-4 flex items-center justify-between gap-3 hover:border-gold transition-colors">
              <div className="min-w-0">
                <p className="font-display text-xl font-bold uppercase truncate">{ev.name}</p>
                <p className="text-xs text-forest-700/60 font-mono">
                  {ev.event_date ? formatDate(ev.event_date) : "bez data"} {ev.location && `· ${ev.location}`} · {ev.team_count} týmů
                  {ev.organizer_name && ` · ${ev.organizer_name}`}
                </p>
              </div>
              <Badge tone={EVENT_STATUS_TONE[ev.status]}>{STATUS_LABELS[ev.status]}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
