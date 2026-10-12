import { useState } from "react";
import { formatSeconds } from "../lib/format";
import { Badge } from "./ui";

export default function ResultsTable({ data }) {
  const [view, setView] = useState("all");

  if (!data || data.results.length === 0) {
    return <p className="text-forest-700/60">Zatím nejsou zapsané žádné výsledky.</p>;
  }

  const categories = data.categories || [];
  const byCategory = view !== "all";
  const rows = byCategory ? data.results.filter((r) => String(r.category_id) === view) : data.results;
  const catName = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  return (
    <div>
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {[{ id: "all", name: "Celkově" }, ...categories].map((c) => (
            <button
              key={c.id}
              onClick={() => setView(String(c.id))}
              className={`px-3 py-1 rounded-full text-sm font-semibold border ${
                view === String(c.id) ? "bg-forest-900 text-foam border-forest-900" : "border-wood/30 hover:bg-forest-50"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-forest-900 text-left font-display uppercase text-xs tracking-wide text-wood">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Tým</th>
              {data.legs.map((leg) => (
                <th key={leg.id} className="py-2 px-2 text-right font-mono" title={leg.name}>
                  {leg.order}
                </th>
              ))}
              <th className="py-2 px-2 text-right">Penalta</th>
              <th className="py-2 pl-2 text-right">Výsledný čas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rank = byCategory ? row.category_rank : row.rank;
              return (
                <tr key={row.team_id} className="border-b border-wood/15 hover:bg-forest-50 align-top">
                  <td className="py-2 pr-2 font-mono font-bold text-wood">
                    {row.has_dnf ? <Badge tone="punch">DNF</Badge> : `${rank}.`}
                  </td>
                  <td className="py-2 pr-2">
                    <div className="font-semibold">{row.team_name}</div>
                    <div className="text-xs text-forest-700/60">
                      {[row.club, !byCategory && catName[row.category_id]].filter(Boolean).join(" · ")}
                      {!row.complete && !row.has_dnf && <span className="text-wood"> · neúplné</span>}
                    </div>
                  </td>
                  {row.legs.map((leg) => (
                    <td key={leg.leg_id} className="py-2 px-2 text-right font-mono text-xs" title={leg.runner || ""}>
                      {leg.dnf ? (
                        <span className="text-punch">DNF</span>
                      ) : leg.recorded ? (
                        <>
                          {formatSeconds(leg.time_seconds)}
                          {leg.penalty_points > 0 && <span className="text-punch"> +{leg.penalty_points}b</span>}
                        </>
                      ) : (
                        <span className="text-forest-700/30">—</span>
                      )}
                      {leg.runner && <div className="font-body text-[10px] text-forest-700/50 truncate max-w-[7rem] ml-auto">{leg.runner}</div>}
                    </td>
                  ))}
                  <td className="py-2 px-2 text-right font-mono text-xs text-wood">
                    {row.total_penalty_points > 0 ? `${row.total_penalty_points}b` : "–"}
                  </td>
                  <td className="py-2 pl-2 text-right font-mono font-bold text-base">{formatSeconds(row.total_score_seconds)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-forest-700/50 mt-3">
        Výsledný čas = součet úseků + trestné body × {data.event.penalty_seconds_per_point} s.
      </p>
    </div>
  );
}
