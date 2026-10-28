import { useState } from "react";
import { Button, Input, Label, Select, Textarea } from "./ui";
import { legLabel } from "../lib/format";
import { api } from "../lib/api";

const CODE_RE = /^\d{6}$/;
const isCode = (v) => CODE_RE.test((v || "").replace(/\s/g, ""));

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
        // jedno pole: e-mail nebo 6místný kód závodníka
        link: byLeg[leg.id]?.email || byLeg[leg.id]?.racer_code || (!initial && i === 0 && user ? user.racer_code || user.email : ""),
        linked: !!byLeg[leg.id]?.user_id,
        autoName: "", // jméno doplněné podle kódu (smí se přepsat dalším kódem)
        codeError: "",
      })),
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const updateMember = (i, patch) =>
    setForm((f) => ({ ...f, members: f.members.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));

  // Po zadání kódu závodníka doplní jméno z jeho účtu.
  async function handleLinkChange(i, value) {
    updateMember(i, { link: value, linked: false, codeError: "" });
    if (!isCode(value)) return;
    const code = value.replace(/\s/g, "");
    try {
      const racer = await api.lookupRacer(code);
      setForm((f) => ({
        ...f,
        members: f.members.map((m, j) => {
          if (j !== i || (m.link || "").replace(/\s/g, "") !== code) return m; // mezitím se pole změnilo
          const replaceName = !m.name.trim() || m.name === m.autoName;
          return { ...m, linked: true, codeError: "", ...(replaceName ? { name: racer.name, autoName: racer.name } : {}) };
        }),
      }));
    } catch {
      setForm((f) => ({
        ...f,
        members: f.members.map((m, j) =>
          j === i && (m.link || "").replace(/\s/g, "") === code ? { ...m, linked: false, codeError: "Neznámý kód závodníka" } : m
        ),
      }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        category_id: form.category_id === "" ? null : Number(form.category_id),
        members: form.members
          .filter((m) => m.name.trim() || isCode(m.link))
          .map(({ leg_id, name, link }) => {
            const value = (link || "").trim();
            return isCode(value)
              ? { leg_id, name, racer_code: value.replace(/\s/g, ""), email: null }
              : { leg_id, name, email: value || null, racer_code: null };
          }),
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
              <div key={leg.id} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-forest-50 rounded-xl p-2">
                <div className="flex items-center gap-2 sm:w-44 shrink-0">
                  <span className="leg-marker !w-7 !h-7 !text-xs">{leg.order}</span>
                  <span className="text-sm font-semibold truncate">{legLabel(leg)}</span>
                </div>
                <Input
                  placeholder={isCode(form.members[i].link) && !form.members[i].codeError ? "Jméno se doplní z účtu" : "Jméno závodníka"}
                  value={form.members[i].name}
                  onChange={(e) => updateMember(i, { name: e.target.value })}
                />
                <div className="relative w-full">
                  <Input
                    placeholder="Kód závodníka nebo e-mail"
                    title="6místný kód najde závodník ve svém profilu (Můj účet). Díky němu se mu přihláška i výsledky připíšou do účtu a rankingu."
                    value={form.members[i].link || ""}
                    onChange={(e) => handleLinkChange(i, e.target.value)}
                    className={`${form.members[i].linked ? "pr-8" : ""} ${form.members[i].codeError ? "!border-punch" : ""}`}
                  />
                  {form.members[i].linked && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-leaf text-sm" title="Propojeno s účtem závodníka">✓</span>
                  )}
                  {form.members[i].codeError && (
                    <p className="text-[11px] text-punch mt-0.5">{form.members[i].codeError}</p>
                  )}
                </div>
              </div>
            ))}
            <p className="text-xs text-forest-700/50">
              Zadej <strong>kód závodníka</strong> (najde ho ve svém profilu) nebo e-mail jeho účtu – jen tak se mu výsledky
              započítají do rankingu. Kód ani e-mail nejsou veřejné. Sestavu můžeš měnit až do uzávěrky.
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
