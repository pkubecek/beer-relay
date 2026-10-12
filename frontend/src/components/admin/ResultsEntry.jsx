import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Button, Card, Input } from "../ui";

function toDraft(t) {
  return { place: t.place ?? "", finish_time: t.finish_time ?? "", dnf: !!t.dnf };
}

/** Zadání výsledků: ke každé štafetě pořadí, čas je nepovinný. */
export default function ResultsEntry({ event, approvedTeams, categories, onSaved }) {
  const [drafts, setDrafts] = useState(() => Object.fromEntries(approvedTeams.map((t) => [t.id, toDraft(t)])));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const groups = useMemo(() => {
    const sortTeams = (list) =>
      [...list].sort((a, b) => (a.start_number ?? 1e9) - (b.start_number ?? 1e9) || a.name.localeCompare(b.name, "cs"));
    if (!categories.length) return [{ key: "all", name: null, teams: sortTeams(approvedTeams) }];
    const g = categories.map((c) => ({ key: c.id, name: c.name, teams: sortTeams(approvedTeams.filter((t) => t.category_id === c.id)) }));
    const rest = approvedTeams.filter((t) => !categories.some((c) => c.id === t.category_id));
    if (rest.length) g.push({ key: "none", name: "Bez kategorie", teams: sortTeams(rest) });
    return g.filter((x) => x.teams.length);
  }, [approvedTeams, categories]);

  const draftOf = (t) => drafts[t.id] ?? toDraft(t);

  function update(t, patch) {
    setMsg("");
    setDrafts((d) => ({ ...d, [t.id]: { ...(d[t.id] ?? toDraft(t)), ...patch } }));
  }

  // Duplicitní pořadí v rámci skupiny – jen upozornění (shoda je povolená).
  function duplicates(teams) {
    const seen = {};
    for (const t of teams) {
      const { place: p, dnf } = draftOf(t);
      if (p !== "" && !dnf) seen[p] = (seen[p] || 0) + 1;
    }
    return new Set(Object.keys(seen).filter((k) => seen[k] > 1).map(Number));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const rows = approvedTeams.map((t) => {
        const d = draftOf(t);
        return {
          team_id: t.id,
          place: d.place === "" || d.dnf ? null : Number(d.place),
          finish_time: d.finish_time || null,
          dnf: d.dnf,
        };
      });
      onSaved(await api.saveResults(event.id, rows));
      setMsg("Výsledky uloženy ✓");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (approvedTeams.length === 0) {
    return <p className="text-sm text-forest-700/60">Nejdřív schval alespoň jeden tým.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-forest-700/70">
        Ke každé štafetě napiš pořadí{categories.length > 0 && " v její kategorii"}. Čas je nepovinný (např. 1:23:45).
        Týmy bez pořadí se ve výsledcích nezobrazí.
      </p>
      {groups.map((g) => {
        const dup = duplicates(g.teams);
        return (
          <Card key={g.key} className="p-4">
            {g.name && <h3 className="font-display text-lg font-bold uppercase mb-3">{g.name}</h3>}
            <div className="divide-y divide-wood/10">
              {g.teams.map((t) => {
                const d = draftOf(t);
                return (
                  <div key={t.id} className="flex flex-wrap items-center gap-3 py-2">
                    <span className="w-10 font-mono text-wood text-sm">{t.start_number ?? ""}</span>
                    <span className="flex-1 min-w-[140px] font-semibold">{t.name}</span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        placeholder="Pořadí"
                        aria-label={`Pořadí ${t.name}`}
                        value={d.place}
                        disabled={d.dnf}
                        onChange={(e) => update(t, { place: e.target.value })}
                        className={`!w-20 text-center font-mono ${dup.has(Number(d.place)) ? "!border-gold" : ""}`}
                      />
                      <span className="text-sm">.</span>
                    </div>
                    <Input
                      placeholder="čas (nepovinný)"
                      value={d.finish_time}
                      disabled={d.dnf}
                      onChange={(e) => update(t, { finish_time: e.target.value })}
                      className="!w-36 font-mono"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-forest-700/70">
                      <input type="checkbox" checked={d.dnf} onChange={(e) => update(t, { dnf: e.target.checked })} />
                      DNF
                    </label>
                  </div>
                );
              })}
            </div>
            {dup.size > 0 && <p className="text-xs text-wood mt-2">Pozor: stejné pořadí má víc týmů ({[...dup].join(", ")}.).</p>}
          </Card>
        );
      })}
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={save} disabled={saving}>{saving ? "Ukládám…" : "Uložit výsledky"}</Button>
        {msg && <span className="text-leaf text-sm">{msg}</span>}
        {error && <span className="text-punch text-sm">{error}</span>}
        <div className="flex-1" />
        <Link to={`/zavody/${event.slug}`} className="text-sm text-wood hover:underline">Zobrazit výsledky ↗</Link>
      </div>
    </div>
  );
}
