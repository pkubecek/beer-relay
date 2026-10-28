import { Badge } from "./ui";
import { TEAM_STATUS_LABELS } from "../lib/format";

function EntriesTable({ teams, legs }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-line text-left uppercase text-[11px] tracking-[0.14em] text-forest-700/50">
            <th className="py-2 pr-2 w-12">Č.</th>
            <th className="py-2 pr-2">Tým</th>
            {legs.map((leg) => (
              <th key={leg.id} className="py-2 px-2 hidden md:table-cell">
                <span className="font-mono">{leg.order}.</span> {leg.name || "úsek"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => {
            const byLeg = Object.fromEntries(t.members.map((m) => [m.leg_id, m.name]));
            return (
              <tr key={t.id} className="border-b border-line align-top">
                <td className="py-2 pr-2 font-mono text-wood">{t.start_number ?? ""}</td>
                <td className="py-2 pr-2">
                  <div className="font-semibold flex items-center gap-2 flex-wrap">
                    {t.name}
                    {t.status === "pending" && <Badge tone="gold">{TEAM_STATUS_LABELS.pending}</Badge>}
                  </div>
                  {t.club && <div className="text-xs text-forest-700/60">{t.club}</div>}
                  {/* na mobilu členové pod názvem */}
                  {t.members.length > 0 && (
                    <div className="md:hidden text-xs text-forest-700/70 mt-1">
                      {legs.map((leg) => byLeg[leg.id] && <div key={leg.id}>{leg.order}. {byLeg[leg.id]}</div>)}
                    </div>
                  )}
                </td>
                {legs.map((leg) => (
                  <td key={leg.id} className="py-2 px-2 hidden md:table-cell text-forest-700/80">
                    {byLeg[leg.id] || <span className="text-forest-700/30">—</span>}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function EntriesList({ teams, legs, categories }) {
  if (!teams.length) return <p className="text-forest-700/60 text-sm">Zatím se nikdo nepřihlásil.</p>;

  if (!categories.length) return <EntriesTable teams={teams} legs={legs} />;

  const groups = categories.map((c) => ({ key: c.id, name: c.name, teams: teams.filter((t) => t.category_id === c.id) }));
  const uncategorized = teams.filter((t) => !categories.some((c) => c.id === t.category_id));
  if (uncategorized.length) groups.push({ key: "none", name: "Bez kategorie", teams: uncategorized });

  return (
    <div className="space-y-8">
      {groups
        .filter((g) => g.teams.length)
        .map((g) => (
          <section key={g.key}>
            <h3 className="font-display text-lg font-bold mb-2">
              {g.name} <span className="text-wood font-mono text-sm">({g.teams.length})</span>
            </h3>
            <EntriesTable teams={g.teams} legs={legs} />
          </section>
        ))}
    </div>
  );
}
