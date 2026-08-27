import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Button, Card, Badge, Input, Label } from "../components/ui";
import { formatDate, STATUS_LABELS } from "../lib/format";

const STATUS_TONE = { draft: "neutral", open: "leaf", closed: "gold", finished: "neutral" };

export default function AdminDashboardPage() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", event_date: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.listEventsAdmin().then(setEvents).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.createEvent(form);
      setForm({ name: "", location: "", event_date: "", description: "" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight">Administrace závodů</h1>
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
              <Input
                type="date"
                value={form.event_date}
                onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Místo</Label>
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Popis</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Vytvářím…" : "Vytvořit závod"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {events === null && <p className="text-forest-700/60">Načítám…</p>}
      <div className="grid gap-3">
        {events?.map((ev) => (
          <Link key={ev.id} to={`/admin/zavody/${ev.slug}`}>
            <Card className="p-4 flex items-center justify-between hover:border-gold transition-colors">
              <div>
                <p className="font-display text-xl font-bold uppercase">{ev.name}</p>
                <p className="text-xs text-forest-700/60 font-mono">
                  {ev.event_date ? formatDate(ev.event_date) : "bez data"} {ev.location && `· ${ev.location}`}
                </p>
              </div>
              <Badge tone={STATUS_TONE[ev.status]}>{STATUS_LABELS[ev.status]}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
