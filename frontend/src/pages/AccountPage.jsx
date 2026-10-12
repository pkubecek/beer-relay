import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ROLE_LABELS } from "../lib/format";
import { Badge, Button, Card, Input, Label } from "../components/ui";
import ProfileFields from "../components/ProfileFields";

export default function AccountPage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    first_name: user.first_name, last_name: user.last_name, birth_year: user.birth_year, club: user.club, phone: user.phone,
  });
  const [msg, setMsg] = useState({ profile: "", password: "" });
  const [err, setErr] = useState({ profile: "", password: "" });
  const [pw, setPw] = useState({ current: "", next: "" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function saveProfile(e) {
    e.preventDefault();
    setMsg((m) => ({ ...m, profile: "" }));
    setErr((x) => ({ ...x, profile: "" }));
    try {
      setUser(await api.updateMe(form));
      setMsg((m) => ({ ...m, profile: "Uloženo ✓" }));
    } catch (e2) {
      setErr((x) => ({ ...x, profile: e2.message }));
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setMsg((m) => ({ ...m, password: "" }));
    setErr((x) => ({ ...x, password: "" }));
    try {
      await api.changePassword(pw.current, pw.next);
      setPw({ current: "", next: "" });
      setMsg((m) => ({ ...m, password: "Heslo změněno ✓" }));
    } catch (e2) {
      setErr((x) => ({ ...x, password: e2.message }));
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 flex-wrap mb-6">
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight">Můj účet</h1>
        <Badge tone="gold">{ROLE_LABELS[user.role]}</Badge>
      </div>

      <Card className="p-6 mb-6">
        <h2 className="font-display text-xl font-bold uppercase mb-1">Profil</h2>
        <p className="text-sm text-forest-700/60 mb-4 font-mono">{user.email}</p>
        <form onSubmit={saveProfile} className="space-y-4">
          {err.profile && <p className="text-punch text-sm">{err.profile}</p>}
          <ProfileFields form={form} update={update} />
          <div className="flex items-center gap-3">
            <Button type="submit">Uložit profil</Button>
            {msg.profile && <span className="text-leaf text-sm">{msg.profile}</span>}
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-xl font-bold uppercase mb-4">Změna hesla</h2>
        <form onSubmit={savePassword} className="space-y-4">
          {err.password && <p className="text-punch text-sm">{err.password}</p>}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Současné heslo</Label>
              <Input type="password" required autoComplete="current-password" value={pw.current}
                onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
            </div>
            <div>
              <Label>Nové heslo (min. 8 znaků)</Label>
              <Input type="password" required minLength={8} autoComplete="new-password" value={pw.next}
                onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="dark">Změnit heslo</Button>
            {msg.password && <span className="text-leaf text-sm">{msg.password}</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}
