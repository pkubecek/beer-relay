import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Badge, Button, Card, Input, Label, Select } from "../components/ui";
import { formatDate, ROLE_LABELS } from "../lib/format";
import ProfileFields from "../components/ProfileFields";

const FILTERS = [
  { key: "", label: "Všichni" },
  { key: "user", label: "Závodníci" },
  { key: "organizer", label: "Mohou zakládat závody" },
  { key: "admin", label: "Admin" },
];

function EditUser({ user, onSaved, onCancel }) {
  const [form, setForm] = useState({
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    birth_year: user.birth_year,
    club: user.club || "",
    phone: user.phone || "",
    new_password: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { new_password, ...rest } = form;
      onSaved(await api.updateUser(user.id, new_password ? { ...rest, new_password } : rest));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4 mt-4 pt-4 border-t border-wood/15">
      {error && <p className="text-punch text-sm">{error}</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>E-mail</Label>
          <Input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
        </div>
        <div>
          <Label>Nové heslo (nechat prázdné = beze změny)</Label>
          <Input type="text" minLength={8} autoComplete="off" value={form.new_password}
            onChange={(e) => update("new_password", e.target.value)} placeholder="min. 8 znaků" />
        </div>
      </div>
      <ProfileFields form={form} update={update} />
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? "Ukládám…" : "Uložit"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Zrušit</Button>
      </div>
    </form>
  );
}

function UserCard({ user, onChange, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = user.role === "admin";

  async function patch(data) {
    setError("");
    try {
      onChange(await api.updateUser(user.id, data));
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove() {
    const extra = user.events_count || user.entries_count
      ? `\n\nPořádá ${user.events_count} závodů a je kapitánem ${user.entries_count} týmů – ty zůstanou, jen bez vazby na účet.`
      : "";
    if (!confirm(`Opravdu smazat účet ${user.email}?${extra}`)) return;
    try {
      await api.deleteUser(user.id);
      onRemove(user.id);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Card className={`p-4 ${user.is_active ? "" : "opacity-60"}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="font-semibold flex items-center gap-2 flex-wrap">
            {user.first_name} {user.last_name}
            <Badge tone={isAdmin ? "punch" : user.role === "organizer" ? "gold" : "neutral"}>{ROLE_LABELS[user.role]}</Badge>
            {!user.is_active && <Badge tone="punch">zablokován</Badge>}
          </p>
          <p className="text-xs text-forest-700/60 font-mono break-all">{user.email}</p>
          <p className="text-xs text-forest-700/60">
            {[user.club, user.birth_year, user.phone].filter(Boolean).join(" · ")}
            {(user.club || user.birth_year || user.phone) && " · "}
            účet od {formatDate(user.created_at.slice(0, 10))}
            {user.events_count > 0 && ` · pořádá ${user.events_count} závodů`}
            {user.entries_count > 0 && ` · kapitán ${user.entries_count} týmů`}
          </p>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-2">
          {isAdmin ? (
            <span className="text-xs text-forest-700/50">Admin účet nejde měnit ani mazat.</span>
          ) : (
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={user.role === "organizer"}
                onChange={(e) => patch({ role: e.target.checked ? "organizer" : "user" })}
              />
              Může zakládat závody
            </label>
          )}
          <div className="flex gap-3 text-xs">
            <button className="text-wood hover:underline" onClick={() => setEditing((x) => !x)}>
              {editing ? "Zavřít" : "Upravit údaje"}
            </button>
            {!isAdmin && (
              <>
                <button className="text-wood hover:underline" onClick={() => patch({ is_active: !user.is_active })}>
                  {user.is_active ? "Zablokovat" : "Odblokovat"}
                </button>
                <button className="text-punch hover:underline" onClick={remove}>Smazat</button>
              </>
            )}
          </div>
        </div>
      </div>
      {error && <p className="text-punch text-sm mt-2">{error}</p>}
      {editing && (
        <EditUser
          user={user}
          onCancel={() => setEditing(false)}
          onSaved={(u) => {
            onChange(u);
            setEditing(false);
          }}
        />
      )}
    </Card>
  );
}

export default function AdminUsersPage() {
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

  const replace = (u) => setUsers((list) => list.map((x) => (x.id === u.id ? u : x)));
  const removeFromList = (id) => setUsers((list) => list.filter((x) => x.id !== id));

  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap mb-2">
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight">Uživatelé</h1>
        {users && <span className="text-sm text-forest-700/60 font-mono">{users.length} účtů</span>}
      </div>
      <p className="text-sm text-forest-700/70 mb-6 max-w-2xl">
        Každý účet je <strong>Závodník</strong> – může přihlašovat týmy. Zaškrtnutím „Může zakládat závody“ mu dáš právo
        zakládat a spravovat vlastní závody.
      </p>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input placeholder="Hledat jméno, e-mail, oddíl…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="w-56">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </Select>
        </div>
      </div>
      {error && <p className="text-punch text-sm mb-3">{error}</p>}
      {users === null && !error && <p className="text-forest-700/60">Načítám…</p>}
      {users?.length === 0 && <Card className="p-6 text-sm text-forest-700/60">Nikdo neodpovídá filtru.</Card>}
      <div className="space-y-2">
        {users?.map((u) => <UserCard key={u.id} user={u} onChange={replace} onRemove={removeFromList} />)}
      </div>
    </div>
  );
}
