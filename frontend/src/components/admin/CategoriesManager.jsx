import { useState } from "react";
import { api } from "../../lib/api";
import { Button, Card, Input, Label } from "../ui";

export default function CategoriesManager({ eventId, categories, onChange }) {
  const empty = { name: "", description: "", order: categories.length + 1, max_teams: "" };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createCategory(eventId, {
        ...form,
        order: Number(form.order) || 0,
        max_teams: form.max_teams === "" ? null : Number(form.max_teams),
      });
      setForm({ ...empty, order: categories.length + 2 });
      onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(cat) {
    if (!confirm(`Smazat kategorii ${cat.name}? Týmy v ní zůstanou bez kategorie.`)) return;
    await api.deleteCategory(cat.id);
    onChange();
  }

  return (
    <div>
      <p className="text-sm text-forest-700/70 mb-4">
        Kategorie jsou volitelné (např. Muži, Ženy, Mix). Když nějaké existují, musí si tým při přihlášce jednu vybrat
        a výsledky se počítají i v rámci kategorie.
      </p>
      <div className="space-y-2 mb-4">
        {categories.map((c) => (
          <Card key={c.id} className="p-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm">{c.name}</p>
              <p className="text-xs text-forest-700/60">
                {c.team_count} týmů{c.max_teams ? ` / max ${c.max_teams}` : ""}
                {c.description && ` · ${c.description}`}
              </p>
            </div>
            <button onClick={() => handleDelete(c)} className="text-xs text-punch hover:underline">Smazat</button>
          </Card>
        ))}
        {categories.length === 0 && <p className="text-sm text-forest-700/60">Bez kategorií – všichni v jednom pořadí.</p>}
      </div>
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 bg-forest-50 p-3 rounded-md">
        {error && <p className="text-punch text-xs w-full">{error}</p>}
        <div className="w-20">
          <Label>Pořadí</Label>
          <Input type="number" value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))} />
        </div>
        <div className="flex-1 min-w-[140px]">
          <Label>Název</Label>
          <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Mix" />
        </div>
        <div className="flex-1 min-w-[140px]">
          <Label>Popis</Label>
          <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="aspoň 1 žena" />
        </div>
        <div className="w-28">
          <Label>Max. týmů</Label>
          <Input type="number" min={1} value={form.max_teams} onChange={(e) => setForm((f) => ({ ...f, max_teams: e.target.value }))} />
        </div>
        <Button type="submit">Přidat</Button>
      </form>
    </div>
  );
}
