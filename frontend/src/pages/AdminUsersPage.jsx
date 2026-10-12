import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Badge, Card, Input, Select } from "../components/ui";
import { formatDate, ROLE_LABELS } from "../lib/format";

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      api.listUsers({ q, role }).then(setUsers).catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [q, role]);

  async function update(u, data) {
    setError("");
    try {
      const updated = await api.updateUser(u.id, data);
      setUsers((list) => list.map((x) => (x.id === u.id ? updated : x)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function resetPassword(u) {
    const pw = prompt(`Nové heslo pro ${u.email} (min. 8 znaků):`);
    if (!pw) return;
    await update(u, { new_password: pw });
    alert("Heslo nastaveno – předej ho uživateli.");
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight mb-6">Uživatelé</h1>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input placeholder="Hledat jméno, e-mail, oddíl…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="w-44">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Všechny role</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
      </div>
      {error && <p className="text-punch text-sm mb-3">{error}</p>}
      {users === null && <p className="text-forest-700/60">Načítám…</p>}
      <div className="space-y-2">
        {users?.map((u) => (
          <Card key={u.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold">
                {u.first_name} {u.last_name}
                {!u.is_active && <Badge tone="punch">zablokován</Badge>}
              </p>
              <p className="text-xs text-forest-700/60 font-mono truncate">
                {u.email}{u.club && ` · ${u.club}`}{u.birth_year && ` · ${u.birth_year}`} · od {formatDate(u.created_at.slice(0, 10))}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="w-36">
                <Select value={u.role} disabled={u.id === me.id} onChange={(e) => update(u, { role: e.target.value })}>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </div>
              <button className="text-wood hover:underline" onClick={() => resetPassword(u)}>Nové heslo</button>
              {u.id !== me.id && (
                <button className="text-punch hover:underline" onClick={() => update(u, { is_active: !u.is_active })}>
                  {u.is_active ? "Zablokovat" : "Odblokovat"}
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
