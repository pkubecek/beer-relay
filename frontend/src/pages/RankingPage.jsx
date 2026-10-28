import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Card, PageHero, Select } from "../components/ui";

const shortDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("cs-CZ");

const MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function RankingPage() {
  const { user } = useAuth();
  const [year, setYear] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    api.ranking(year ? { year } : {}).then(setData).catch((e) => setError(e.message));
  }, [year]);

  const years = data ? Array.from(new Set([data.year, ...data.years])).sort((a, b) => b - a) : [];

  return (
    <div>
      <PageHero
        overlap
        eyebrow="Sezónní žebříček závodníků"
        title="Ranking"
        subtitle="Body za umístění týmu dostane každý člen sestavy s účtem."
        aside={
          data && (
            <div className="w-40">
              <Select value={data.year} onChange={(e) => { setYear(Number(e.target.value)); setOpenId(null); }}>
                {years.map((y) => <option key={y} value={y}>Sezóna {y}</option>)}
              </Select>
            </div>
          )
        }
      />

      {data && (
        <Card className="p-4 mb-4 text-sm text-forest-700/80">
          Body za pořadí týmu:{" "}
          {Object.entries(data.place_points).map(([place, pts], i) => (
            <span key={place} className="whitespace-nowrap">
              {i > 0 && " · "}<strong>{place}.</strong> {pts} b
            </span>
          ))}
          . Body dostane každý člen týmu s účtem. Do sezóny se počítají <strong>{data.best_count} nejlepší závody</strong>.
        </Card>
      )}

      {error && <p className="text-punch">{error}</p>}
      {!data && !error && <p className="text-forest-700/60">Načítám…</p>}
      {data?.rows.length === 0 && (
        <Card className="p-6 text-sm text-forest-700/60">V sezóně {data.year} zatím nikdo nebodoval.</Card>
      )}

      {data?.rows.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-line text-left uppercase text-[11px] tracking-[0.14em] text-forest-700/50">
                <th className="py-3 pl-4 pr-2 w-14">#</th>
                <th className="py-2 pr-2">Závodník</th>
                <th className="py-2 px-2 text-center hidden sm:table-cell">Závody</th>
                <th className="py-2 px-2 text-center hidden sm:table-cell">Výhry</th>
                <th className="py-3 pl-2 pr-4 text-right">Body</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => {
                const isOpen = openId === row.user_id;
                const isMe = user?.id === row.user_id;
                return (
                  <Fragment key={row.user_id}>
                    <tr
                      onClick={() => setOpenId(isOpen ? null : row.user_id)}
                      className={`border-b border-line cursor-pointer hover:bg-forest-50 ${isMe ? "bg-gold-50" : ""}`}
                    >
                      <td className="py-2.5 pl-4 pr-2 font-display font-bold text-base">{MEDAL[row.rank] || `${row.rank}.`}</td>
                      <td className="py-2.5 pr-2">
                        <div className="font-semibold">
                          {row.name} {isMe && <span className="text-xs text-wood font-normal">(ty)</span>}
                        </div>
                        {row.club && <div className="text-xs text-forest-700/60">{row.club}</div>}
                      </td>
                      <td className="py-2 px-2 text-center hidden sm:table-cell">{row.races}</td>
                      <td className="py-2 px-2 text-center hidden sm:table-cell">{row.wins}</td>
                      <td className="py-2.5 pl-2 pr-4 text-right font-display text-lg font-bold">
                        {row.points}
                        <span className="ml-1 text-xs text-forest-700/50">{isOpen ? "▴" : "▾"}</span>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-forest-50/60">
                        <td />
                        <td colSpan={4} className="py-2 pr-2">
                          <ul className="space-y-1 text-xs">
                            {row.results.map((r) => (
                              <li key={r.event_id} className={`flex items-center gap-3 ${r.counted ? "" : "text-forest-700/45"}`}>
                                <span className="w-20 shrink-0">{r.event_date ? shortDate(r.event_date) : ""}</span>
                                <Link to={`/zavody/${r.event_slug}`} className="flex-1 hover:underline truncate" onClick={(e) => e.stopPropagation()}>
                                  {r.event_name} <span className="text-forest-700/60">· {r.team_name}</span>
                                </Link>
                                <span className="w-8 text-right">{r.place}.</span>
                                <span className={`w-12 text-right font-semibold ${r.counted ? "" : "line-through"}`}>{r.points} b</span>
                              </li>
                            ))}
                          </ul>
                          {row.results.length > data.best_count && (
                            <p className="text-[11px] text-forest-700/50 mt-1">Přeškrtnuté výsledky se nezapočítávají.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
