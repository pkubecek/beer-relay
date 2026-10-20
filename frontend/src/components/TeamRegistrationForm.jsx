import { useState } from "react";
import { Button, Input, Label, Select, Textarea } from "./ui";
import { legLabel } from "../lib/format";

/**
 * Formulář přihlášky týmu – členové po úsecích.
 * `initial` = existující přihláška (úprava) nebo null (nová).
 */
export default function TeamRegistrationForm({ legs, categories, initial, user, onSubmit, submitLabel = "Odeslat přihlášku" }) {
  const [form, setForm] = useState(() => {
    const byLeg = Object.fromEntries((initial?.members || []).map((m) => [m.leg_id, m]));
    return {
      name: initial?.name || "",
      club: initial?.club ?? user?.club ?? "",
      category_id: initial?.category_id ?? (categories.length === 1 ? categories[0].id : ""),
      contact_phone: initial?.contact_phone ?? user?.phone ?? "",
      note: initial?.note || "",
      members: legs.map((leg, i) => ({
        leg_id: leg.id,
        name: byLeg[leg.id]?.name ?? (!initial && i === 0 && user ? `${user.first_name} ${user.last_name}` : ""),
        email: byLeg[leg.id]?.email ?? (!initial && i === 0 && user ? user.email : ""),
      })),
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const updateMember = (i, patch) =>
    setForm((f) => ({ ...f, members: f.members.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        category_id: form.category_id === "" ? null : Number(form.category_id),
        members: form.members.filter((m) => m.name.trim()).map((m) => ({ ...m, email: m.email?.trim() || null })),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <p className="text-punch text-sm font-medium">{error}</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Název týmu</Label>
          <Input required maxLength={80} value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Pivenkáři" />
        </div>
        <div>
          <Label>Oddíl (volitelné)</Label>
          <Input value={form.club} onChange={(e) => update("club", e.target.value)} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {categories.length > 0 && (
          <div>
            <Label>Kategorie</Label>
            <Select required value={form.category_id} onChange={(e) => update("category_id", e.target.value)}>
              <option value="">— vyber —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.max_teams ? ` (${c.team_count}/${c.max_teams})` : ""}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div>
          <Label>Telefon</Label>
          <Input type="tel" value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} placeholder="+420…" />
        </div>
      </div>

      <div>
        <Label>Sestava po úsecích</Label>
        {legs.length === 0 ? (
          <p className="text-sm text-forest-700/60">Pořadatel zatím nezveřejnil úseky – sestavu doplníš později.</p>
        ) : (
          <div className="space-y-2">
            {legs.map((leg, i) => (
              <div key={leg.id} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-forest-50 rounded-md p-2">
                <div className="flex items-center gap-2 sm:w-44 shrink-0">
                  <span className="leg-marker !w-7 !h-7 !text-xs">{leg.order}</span>
                  <span className="text-sm font-semibold truncate">{legLabel(leg)}</span>
                </div>
                <Input placeholder="Jméno závodníka" value={form.members[i].name} onChange={(e) => updateMember(i, { name: e.target.value })} />
                <Input
                  type="email"
                  placeholder="E-mail (nepovinné)"
                  title="Když má závodník účet s tímto e-mailem, uvidí přihlášku v Mých přihláškách"
                  value={form.members[i].email || ""}
                  onChange={(e) => updateMember(i, { email: e.target.value })}
                />
              </div>
            ))}
            <p className="text-xs text-forest-700/50">
              E-mail je neveřejný – slouží jen k propojení s účtem závodníka. Sestavu můžeš měnit až do uzávěrky.
            </p>
          </div>
        )}
      </div>

      <div>
        <Label>Poznámka pro pořadatele</Label>
        <Textarea rows={2} value={form.note} onChange={(e) => update("note", e.target.value)} />
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Ukládám…" : submitLabel}
      </Button>
    </form>
  );
}
