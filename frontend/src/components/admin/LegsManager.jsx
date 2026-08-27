import { useState } from "react";
import { api } from "../../lib/api";
import { Button, Card, Input, Label } from "../ui";

export default function LegsManager({ eventId, legs, onChange }) {
  const [form, setForm] = useState({ order: legs.length + 1, name: "", description: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.createLeg(eventId, { ...form, order: Number(form.order) });
      setForm({ order: legs.length + 2, name: "", description: "" });
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(legId) {
    if (!confirm("Smazat úsek? Smažou se i navázané výsledky.")) return;
    await api.deleteLeg(legId);
    onChange();
  }

  return (
    <div>
      <div className="space-y-2 mb-4">
        {legs.map((leg) => (
          <Card key={leg.id} className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="leg-marker !w-7 !h-7 !text-xs">{leg.order}</span>
              <div>
                <p className="font-semibold text-sm">{leg.name}</p>
                {leg.description && <p className="text-xs text-forest-700/60">{leg.description}</p>}
              </div>
            </div>
            <button
              onClick={() => handleDelete(leg.id)}
              className="text-xs text-punch hover:underline"
            >
              Smazat
            </button>
          </Card>
        ))}
        {legs.length === 0 && <p className="text-sm text-forest-700/60">Zatím žádné úseky.</p>}
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 bg-forest-50 p-3 rounded-md">
        {error && <p className="text-punch text-xs w-full">{error}</p>}
        <div className="w-20">
          <Label>Pořadí</Label>
          <Input
            type="number"
            min={1}
            required
            value={form.order}
            onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <Label>Název úseku</Label>
          <Input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="např. Lesní okruh"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <Label>Popis (volitelně)</Label>
          <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <Button type="submit" disabled={submitting}>
          Přidat úsek
        </Button>
      </form>
    </div>
  );
}
