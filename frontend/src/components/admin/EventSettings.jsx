import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { STATUS_LABELS, toDateTimeInput } from "../../lib/format";
import { Button, Card, Input, Label, Select, Textarea } from "../ui";
import { MapPicker } from "../Map";

const FIELDS = [
  "name", "slug", "location", "event_date", "start_time", "description", "status", "entries_open_at", "entry_deadline",
  "entry_fee", "max_teams", "require_approval", "contact_email", "website", "lat", "lon",
];

function toForm(event) {
  const f = {};
  for (const k of FIELDS) f[k] = event[k] ?? "";
  f.entries_open_at = toDateTimeInput(event.entries_open_at);
  f.entry_deadline = toDateTimeInput(event.entry_deadline);
  f.require_approval = !!event.require_approval;
  f.lat = event.lat ?? null;
  f.lon = event.lon ?? null;
  return f;
}

const nullable = (v) => (v === "" ? null : v);
const nullableInt = (v) => (v === "" || v === null ? null : Number(v));

export default function EventSettings({ event, onSaved }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => toForm(event));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [mapLabel, setMapLabel] = useState("");
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function handleMapPick({ lat, lon, label }) {
    setForm((f) => ({ ...f, lat, lon, location: !f.location && label ? label : f.location }));
    setMapLabel(label || "");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const payload = {
        ...form,
        event_date: nullable(form.event_date),
        start_time: nullable(form.start_time),
        entries_open_at: nullable(form.entries_open_at),
        entry_deadline: nullable(form.entry_deadline),
        entry_fee: nullableInt(form.entry_fee),
        max_teams: nullableInt(form.max_teams),
        contact_email: nullable(form.contact_email),
        website: nullable(form.website),
      };
      const updated = await api.updateEvent(event.id, payload);
      setForm(toForm(updated));
      setMsg("Uloženo ✓");
      onSaved(updated);
      if (updated.slug !== event.slug) navigate(`/admin/zavody/${updated.slug}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Opravdu smazat závod „${event.name}" včetně všech přihlášek a výsledků?`)) return;
    await api.deleteEvent(event.id);
    navigate("/admin");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-punch text-sm">{error}</p>}
      <Card className="p-5 space-y-4">
        <h3 className="font-display text-lg font-bold uppercase">Základní údaje</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Název</Label>
            <Input required value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <Label>Adresa (slug)</Label>
            <Input value={form.slug} onChange={(e) => update("slug", e.target.value)} />
          </div>
          <div>
            <Label>Stav</Label>
            <Select value={form.status} onChange={(e) => update("status", e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Datum</Label>
            <Input type="date" value={form.event_date} onChange={(e) => update("event_date", e.target.value)} />
          </div>
          <div>
            <Label>Čas startu</Label>
            <Input type="time" value={form.start_time} onChange={(e) => update("start_time", e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Místo</Label>
            <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="např. Hospoda U Lípy, Říp" />
            {mapLabel && mapLabel !== form.location && (
              <button type="button" className="text-xs text-wood hover:underline" onClick={() => update("location", mapLabel)}>
                Použít název z mapy: „{mapLabel}“
              </button>
            )}
            <MapPicker lat={form.lat} lon={form.lon} onChange={handleMapPick} />
          </div>
          <div className="sm:col-span-2">
            <Label>Popis / pokyny</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} />
          </div>
          <div>
            <Label>Kontaktní e-mail</Label>
            <Input type="email" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} />
          </div>
          <div>
            <Label>Web závodu</Label>
            <Input type="url" value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://…" />
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-display text-lg font-bold uppercase">Přihlášky</h3>
        <p className="text-xs text-forest-700/60">
          Přihlašovat se dá, když je stav „Přihlášky otevřeny“ a zároveň jsi v rozmezí termínů a není naplněná kapacita.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Přihlášky od</Label>
            <Input type="datetime-local" value={form.entries_open_at} onChange={(e) => update("entries_open_at", e.target.value)} />
          </div>
          <div>
            <Label>Uzávěrka</Label>
            <Input type="datetime-local" value={form.entry_deadline} onChange={(e) => update("entry_deadline", e.target.value)} />
          </div>
          <div>
            <Label>Startovné za tým (Kč)</Label>
            <Input type="number" min={0} value={form.entry_fee} onChange={(e) => update("entry_fee", e.target.value)} />
          </div>
          <div>
            <Label>Kapacita (max. týmů)</Label>
            <Input type="number" min={1} value={form.max_teams} onChange={(e) => update("max_teams", e.target.value)} />
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.require_approval} onChange={(e) => update("require_approval", e.target.checked)} />
            Přihlášky musím schválit (jinak jsou rovnou potvrzené)
          </label>
        </div>
      </Card>

      <div className="flex items-center gap-3 flex-wrap">
        <Button type="submit" disabled={saving}>{saving ? "Ukládám…" : "Uložit nastavení"}</Button>
        {msg && <span className="text-leaf text-sm">{msg}</span>}
        <div className="flex-1" />
        <Button type="button" variant="danger" onClick={handleDelete}>Smazat závod</Button>
      </div>
    </form>
  );
}
