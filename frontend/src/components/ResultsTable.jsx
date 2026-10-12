import { Badge } from "./ui";

function Table({ rows, legs }) {
  const hasTime = rows.some((r) => r.finish_time);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-forest-900 text-left font-display uppercase text-xs tracking-wide text-wood">
            <th className="py-2 pr-2 w-12">#</th>
            <th className="py-2 pr-2">Tým</th>
            <th className="py-2 pr-2 hidden sm:table-cell">Sestava</th>
            {hasTime && <th className="py-2 pl-2 text-right">Čas</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.team_id} className="border-b border-wood/15 hover:bg-forest-50 align-top">
              <td className="py-2 pr-2 font-mono font-bold text-wood text-base">
                {row.dnf ? <Badge tone="punch">DNF</Badge> : `${row.place}.`}
              </td>
              <td className="py-2 pr-2">
                <div className="font-semibold">{row.team_name}</div>
                {row.club && <div className="text-xs text-forest-700/60">{row.club}</div>}
              </td>
              <td className="py-2 pr-2 hidden sm:table-cell text-xs text-forest-700/70">
                {legs.map((leg, i) => row.runners[i] && (
                  <span key={leg.id} className="mr-3 whitespace-nowrap">
                    <span className="font-mono text-wood">{leg.order}.</span> {row.runners[i]}
                  </span>
                ))}
              </td>
              {hasTime && <td className="py-2 pl-2 text-right font-mono">{row.finish_time || ""}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ResultsTable({ data }) {
  if (!data || data.results.length === 0) {
    return <p className="text-forest-700/60">Zatím nejsou zveřejněné žádné výsledky.</p>;
  }
  const categories = data.categories || [];
  if (!categories.length) return <Table rows={data.results} legs={data.legs} />;

  const groups = categories.map((c) => ({ key: c.id, name: c.name, rows: data.results.filter((r) => r.category_id === c.id) }));
  const rest = data.results.filter((r) => !categories.some((c) => c.id === r.category_id));
  if (rest.length) groups.push({ key: "none", name: "Bez kategorie", rows: rest });

  return (
    <div className="space-y-8">
      {groups.filter((g) => g.rows.length).map((g) => (
        <section key={g.key}>
          <h3 className="font-display text-lg font-bold uppercase mb-2">{g.name}</h3>
          <Table rows={g.rows} legs={data.legs} />
        </section>
      ))}
    </div>
  );
}
