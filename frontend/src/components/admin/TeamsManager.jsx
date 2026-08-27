import { api } from "../../lib/api";
import { Badge, Button, Card } from "../ui";
import { TEAM_STATUS_LABELS } from "../../lib/format";

const TONE = { pending: "gold", approved: "leaf", rejected: "punch" };

export default function TeamsManager({ teams, onChange }) {
  async function setStatus(teamId, status) {
    await api.setTeamStatus(teamId, status);
    onChange();
  }

  async function remove(teamId) {
    if (!confirm("Opravdu smazat tento tým i s výsledky?")) return;
    await api.deleteTeam(teamId);
    onChange();
  }

  if (teams.length === 0) return <p className="text-sm text-forest-700/60">Zatím se nikdo nepřihlásil.</p>;

  return (
    <div className="space-y-2">
      {teams.map((t) => (
        <Card key={t.id} className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-display font-bold text-lg uppercase">{t.name}</p>
                <Badge tone={TONE[t.status]}>{TEAM_STATUS_LABELS[t.status]}</Badge>
              </div>
              <p className="text-sm text-forest-700/70">
                {t.contact_name} · {t.contact_email} {t.contact_phone && `· ${t.contact_phone}`}
              </p>
              {t.members && <p className="text-xs text-forest-700/60 mt-1 whitespace-pre-line">{t.members}</p>}
              {t.note && <p className="text-xs text-forest-700/50 mt-1 italic">{t.note}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              {t.status !== "approved" && (
                <Button variant="dark" onClick={() => setStatus(t.id, "approved")}>
                  Schválit
                </Button>
              )}
              {t.status !== "rejected" && (
                <Button variant="outline" onClick={() => setStatus(t.id, "rejected")}>
                  Zamítnout
                </Button>
              )}
              <Button variant="danger" onClick={() => remove(t.id)}>
                Smazat
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
