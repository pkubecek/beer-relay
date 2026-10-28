import { useState } from "react";
import { Badge, Card, Segmented } from "./ui";

const MEDAL = {
  1: { circle: "bg-gold text-forest-900", card: "bg-gold-50 border-gold/50" },
  2: { circle: "bg-silver text-forest-900", card: "" },
  3: { circle: "bg-bronze text-forest-900", card: "" },
};

function Runners({ row, legs, className = "" }) {
  const names = legs.map((leg, i) => row.runners[i] && { leg, name: row.runners[i] }).filter(Boolean);
  if (!names.length) return null;
  return (
    <p className={`text-xs text-forest-700/60 ${className}`}>
      {names.map(({ leg, name }, i) => (
        <span key={leg.id} className="whitespace-nowrap">
          {i > 0 && <span className="mr-1 text-forest-700/30">→</span>}
          {name}{" "}
        </span>
      ))}
    </p>
  );
}

function Podium({ rows, legs }) {
  return (
    <div className="grid md:grid-cols-3 gap-3 mb-4">
      {rows.map((row) => {
        const m = MEDAL[row.place];
        return (
          <Card key={row.team_id} className={`p-4 ${m.card}`}>
            <div className="flex items-start gap-3">
              <span className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-extrabold text-lg shrink-0 ${m.circle}`}>
                {row.place}
              </span>
              <div className="min-w-0">
                <p className="font-display text-xl font-bold tracking-tight leading-tight">{row.team_name}</p>
                {row.club && <p className="text-sm text-forest-700/60">{row.club}</p>}
              </div>
            </div>
            {row.finish_time && <p className="font-display text-2xl font-extrabold mt-2 tabular">{row.finish_time}</p>}
            <Runners row={row} legs={legs} className="mt-2" />
          </Card>
        );
      })}
    </div>
  );
}

function Table({ rows, legs }) {
  if (!rows.length) return null;
  const hasTime = rows.some((r) => r.finish_time);
  return (
    <Card className="overflow-x-auto">
      <table className="w-full table-fixed text-sm border-collapse">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-forest-700/50 border-b border-line">
            <th className="py-3 pl-4 pr-2 w-16 sm:w-20 font-semibold">Pořadí</th>
            <th className="py-3 pr-2 font-semibold">Tým</th>
            <th className="py-3 pr-2 hidden md:table-cell w-[45%] font-semibold">Sestava</th>
            {hasTime && <th className="py-3 pl-2 pr-4 w-24 text-right font-semibold">Čas</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.team_id} className="border-b border-line last:border-0 hover:bg-forest-50 align-top">
              <td className="py-3 pl-4 pr-2 font-display font-bold text-base tabular">
                {row.dnf ? <Badge tone="punch">DNF</Badge> : `${row.place}.`}
              </td>
              <td className="py-3 pr-2">
                <div className="font-semibold">{row.team_name}</div>
                {row.club && <div className="text-xs text-forest-700/55">{row.club}</div>}
                <Runners row={row} legs={legs} className="md:hidden mt-1" />
              </td>
              <td className="py-3 pr-2 hidden md:table-cell">
                <Runners row={row} legs={legs} />
              </td>
              {hasTime && <td className="py-3 pl-2 pr-4 text-right font-display font-bold tabular">{row.finish_time || ""}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function Standings({ rows, legs }) {
  const podium = rows.filter((r) => !r.dnf && r.place >= 1 && r.place <= 3);
  const rest = rows.filter((r) => !podium.includes(r));
  return (
    <>
      {podium.length > 0 && <Podium rows={podium} legs={legs} />}
      <Table rows={rest} legs={legs} />
    </>
  );
}

export default function ResultsTable({ data }) {
  const [active, setActive] = useState(null);

  if (data === null || data === undefined) return <p className="text-forest-700/60">Načítám výsledky…</p>;
  if (data.results.length === 0) {
    return <Card className="p-10 text-center text-forest-700/60">Zatím nejsou zveřejněné žádné výsledky.</Card>;
  }

  const categories = data.categories || [];
  if (!categories.length) return <Standings rows={data.results} legs={data.legs} />;

  const groups = categories.map((c) => ({ key: String(c.id), name: c.name, rows: data.results.filter((r) => r.category_id === c.id) }));
  const rest = data.results.filter((r) => !categories.some((c) => c.id === r.category_id));
  if (rest.length) groups.push({ key: "none", name: "Bez kategorie", rows: rest });
  const visible = groups.filter((g) => g.rows.length);
  const current = visible.find((g) => g.key === active) || visible[0];

  return (
    <div>
      {visible.length > 1 && (
        <Segmented
          options={visible.map((g) => ({ key: g.key, label: `${g.name} · ${g.rows.length}` }))}
          value={current.key}
          onChange={setActive}
          className="mb-4"
        />
      )}
      {visible.length === 1 && <h3 className="font-display text-xl font-bold mb-3">{current.name}</h3>}
      <Standings rows={current.rows} legs={data.legs} />
    </div>
  );
}
