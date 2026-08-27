import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { Button, Card, Input } from "../ui";
import { formatSeconds, parseTimeToSeconds } from "../../lib/format";

export default function ResultsEntry({ approvedTeams, legs, results, onChange }) {
  const resultMap = useMemo(() => {
    const m = {};
    for (const r of results) m[`${r.team_id}-${r.leg_id}`] = r;
    return m;
  }, [results]);

  const [drafts, setDrafts] = useState({});
  const [savingKey, setSavingKey] = useState(null);

  function draftFor(teamId, legId) {
    const key = `${teamId}-${legId}`;
    if (drafts[key]) return drafts[key];
    const existing = resultMap[key];
    return {
      time: existing?.time_seconds != null ? formatSeconds(existing.time_seconds) : "",
      penalty_points: existing?.penalty_points ?? 0,
      dnf: existing?.dnf ?? false,
    };
  }

  function updateDraft(teamId, legId, patch) {
    const key = `${teamId}-${legId}`;
    setDrafts((d) => ({ ...d, [key]: { ...draftFor(teamId, legId), ...patch } }));
  }

  async function save(teamId, legId) {
    const key = `${teamId}-${legId}`;
    const draft = draftFor(teamId, legId);
    setSavingKey(key);
    try {
      await api.upsertResult({
        team_id: teamId,
        leg_id: legId,
        time_seconds: draft.dnf ? null : parseTimeToSeconds(draft.time),
        penalty_points: Number(draft.penalty_points) || 0,
        dnf: draft.dnf,
      });
      onChange();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingKey(null);
    }
  }

  if (approvedTeams.length === 0) {
    return <p className="text-sm text-forest-700/60">Nejdřív schval alespoň jeden tým.</p>;
  }
  if (legs.length === 0) {
    return <p className="text-sm text-forest-700/60">Nejdřív přidej úseky štafety.</p>;
  }

  return (
    <div className="space-y-4">
      {approvedTeams.map((team) => (
        <Card key={team.id} className="p-4">
          <p className="font-display font-bold text-lg uppercase mb-3">{team.name}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {legs.map((leg) => {
              const draft = draftFor(team.id, leg.id);
              const key = `${team.id}-${leg.id}`;
              return (
                <div key={leg.id} className="border border-wood/20 rounded-md p-3">
                  <p className="text-xs font-mono uppercase text-wood mb-2">
                    Úsek {leg.order} · {leg.name}
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      placeholder="mm:ss"
                      value={draft.time}
                      disabled={draft.dnf}
                      onChange={(e) => updateDraft(team.id, leg.id, { time: e.target.value })}
                      className="!py-1 text-sm"
                    />
                    <Input
                      type="number"
                      min={0}
                      title="Trestné body"
                      value={draft.penalty_points}
                      onChange={(e) => updateDraft(team.id, leg.id, { penalty_points: e.target.value })}
                      className="!py-1 text-sm w-20"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-forest-700/70 mb-2">
                    <input
                      type="checkbox"
                      checked={draft.dnf}
                      onChange={(e) => updateDraft(team.id, leg.id, { dnf: e.target.checked })}
                    />
                    DNF (nedokončil)
                  </label>
                  <Button
                    variant="outline"
                    className="w-full !py-1 text-xs"
                    onClick={() => save(team.id, leg.id)}
                    disabled={savingKey === key}
                  >
                    {savingKey === key ? "Ukládám…" : "Uložit"}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
