import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Badge, Button, Card, Input, Select } from "../ui";
import { formatDateTime, formatMoney, TEAM_STATUS_LABELS, TEAM_STATUS_TONE } from "../../lib/format";

export default function TeamsManager({ event, teams, legs, categories, onChange }) {
  const [filter, setFilter] = useState("all");
  const [startFrom, setStartFrom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn) {
    setError("");
    try {
      await fn();
      onChange();
    } catch (e) {
      setError(e.message);
    }
  }

  const patch = (teamId, data) => run(() => api.manageEntry(teamId, data));

  async function remove(team) {
    if (!confirm(`Opravdu smazat tým ${team.name} i s výsledky?`)) return;
    run(() => api.deleteEntry(team.id));
  }

  async function assignNumbers() {
    if (!confirm(`Přidělit startovní čísla od ${startFrom} všem schváleným týmům? Stávající čísla se přepíšou.`)) return;
    setBusy(true);
    await run(() => api.assignStartNumbers(event.id, { start_from: Number(startFrom) || 1, only_approved: true }));
    setBusy(false);
  }

  async function exportCsv() {
    try {
      await api.downloadEntriesCsv(event.id, `prihlasky-${event.slug}.csv`);
    } catch (e) {
      setError(e.message);
    }
  }

  const legName = Object.fromEntries(legs.map((l) => [l.id, `${l.order}. ${l.name || "úsek"}`]));
  const active = teams.filter((t) => t.status !== "rejected");
  const shown = filter === "all" ? teams : filter === "unpaid" ? active.filter((t) => !t.paid) : teams.filter((t) => t.status === filter);
  const paidCount = active.filter((t) => t.paid).length;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          ["Přihlášeno", active.length + (event.max_teams ? ` / ${event.max_teams}` : "")],
          ["Čeká na schválení", teams.filter((t) => t.status === "pending").length],
          ["Zaplaceno", `${paidCount} / ${active.length}`],
          ["Vybráno", event.entry_fee != null ? formatMoney(paidCount * event.entry_fee) : "–"],
        ].map(([label, value]) => (
          <Card key={label} className="p-3">
            <p className="text-xs uppercase tracking-wide text-wood font-semibold">{label}</p>
            <p className="font-display text-2xl font-bold">{value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="w-44">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Všechny ({teams.length})</option>
            <option value="pending">Čekající</option>
            <option value="approved">Schválené</option>
            <option value="rejected">Zamítnuté</option>
            <option value="unpaid">Nezaplacené</option>
          </Select>
        </div>
        <Button variant="outline" onClick={exportCsv}>⬇ Export CSV</Button>
        <div className="flex items-center gap-1">
          <Input type="number" min={1} value={startFrom} onChange={(e) => setStartFrom(e.target.value)} className="!w-20" title="První startovní číslo" />
          <Button variant="outline" onClick={assignNumbers} disabled={busy}>Přidělit st. čísla</Button>
        </div>
        <Link to={`/zavody/${event.slug}/prihlaska`}><Button variant="ghost">+ Dohlásit tým</Button></Link>
      </div>

      {error && <p className="text-punch text-sm mb-3">{error}</p>}
      {shown.length === 0 && <p className="text-sm text-forest-700/60">Žádné přihlášky.</p>}

      <div className="space-y-2">
        {shown.map((t) => (
          <Card key={t.id} className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-display font-bold text-lg uppercase">{t.name}</p>
                  <Badge tone={TEAM_STATUS_TONE[t.status]}>{TEAM_STATUS_LABELS[t.status]}</Badge>
                  {t.club && <span className="text-xs text-forest-700/60">{t.club}</span>}
                </div>
                <p className="text-sm text-forest-700/70">
                  {t.contact_name} · <a className="hover:underline" href={`mailto:${t.contact_email}`}>{t.contact_email}</a>
                  {t.contact_phone && ` · ${t.contact_phone}`}
                </p>
                {t.members.length > 0 && (
                  <ul className="text-xs text-forest-700/70 mt-1">
                    {t.members.map((m) => (
                      <li key={m.id}>
                        <span className="font-mono text-wood">{legName[m.leg_id] || "bez úseku"}:</span> {m.name}
                        {m.user_id && <span title="Má účet"> ✓</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {t.legacy_members && <p className="text-xs text-forest-700/60 mt-1 whitespace-pre-line">{t.legacy_members}</p>}
                {t.note && <p className="text-xs text-forest-700/50 mt-1 italic">„{t.note}“</p>}
                <p className="text-[11px] text-forest-700/40 mt-1 font-mono">přihlášeno {formatDateTime(t.created_at)}</p>
              </div>

              <div className="flex flex-col gap-2 w-full sm:w-56 shrink-0">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="St. č."
                    defaultValue={t.start_number ?? ""}
                    key={`sn-${t.id}-${t.start_number}`}
                    onBlur={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      if (v !== t.start_number) patch(t.id, { start_number: v });
                    }}
                    className="!w-20"
                    title="Startovní číslo"
                  />
                  {categories.length > 0 && (
                    <Select value={t.category_id ?? ""} onChange={(e) => patch(t.id, { category_id: e.target.value === "" ? null : Number(e.target.value) })}>
                      <option value="">— kategorie —</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={t.paid} onChange={(e) => patch(t.id, { paid: e.target.checked })} />
                  Zaplaceno
                </label>
                <div className="flex gap-2 flex-wrap">
                  {t.status !== "approved" && <Button variant="dark" className="!px-3" onClick={() => patch(t.id, { status: "approved" })}>Schválit</Button>}
                  {t.status !== "rejected" && <Button variant="outline" className="!px-3" onClick={() => patch(t.id, { status: "rejected" })}>Zamítnout</Button>}
                </div>
                <div className="flex gap-3 text-xs">
                  <Link to={`/zavody/${event.slug}/prihlaska/${t.id}`} className="text-wood hover:underline">Upravit sestavu</Link>
                  <button onClick={() => remove(t)} className="text-punch hover:underline">Smazat</button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
