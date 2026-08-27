import { formatSeconds } from "../lib/format";
import { Badge } from "./ui";

export default function ResultsTable({ data }) {
  if (!data || data.results.length === 0) {
    return <p className="text-forest-700/60">Zatím nejsou zapsané žádné výsledky.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-forest-900 text-left font-display uppercase text-xs tracking-wide text-wood">
            <th className="py-2 pr-2">#</th>
            <th className="py-2 pr-2">Tým</th>
            {data.legs.map((leg) => (
              <th key={leg.id} className="py-2 px-2 text-right font-mono">
                {leg.order}
              </th>
            ))}
            <th className="py-2 px-2 text-right">Penalta</th>
            <th className="py-2 pl-2 text-right">Výsledný čas</th>
          </tr>
        </thead>
        <tbody>
          {data.results.map((row) => (
            <tr key={row.team_id} className="border-b border-wood/15 hover:bg-forest-50">
              <td className="py-2 pr-2 font-mono font-bold text-wood">
                {row.rank ?? <Badge tone="punch">DNF</Badge>}
              </td>
              <td className="py-2 pr-2 font-semibold">{row.team_name}</td>
              {row.legs.map((leg) => (
                <td key={leg.leg_id} className="py-2 px-2 text-right font-mono text-xs">
                  {leg.dnf ? (
                    <span className="text-punch">DNF</span>
                  ) : leg.recorded ? (
                    <>
                      {formatSeconds(leg.time_seconds)}
                      {leg.penalty_points > 0 && (
                        <span className="text-punch"> +{leg.penalty_points}b</span>
                      )}
                    </>
                  ) : (
                    <span className="text-forest-700/30">—</span>
                  )}
                </td>
              ))}
              <td className="py-2 px-2 text-right font-mono text-xs text-wood">
                {row.total_penalty_points > 0 ? `${row.total_penalty_points}b` : "–"}
              </td>
              <td className="py-2 pl-2 text-right font-mono font-bold text-base">
                {formatSeconds(row.total_score_seconds)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
