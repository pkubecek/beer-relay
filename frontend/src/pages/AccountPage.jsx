import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDate, ROLE_LABELS } from "../lib/format";
import { Badge, Button, Card, Input, Label, Textarea } from "../components/ui";
import { Link, useNavigate } from "react-router-dom";
import ProfileFields from "../components/ProfileFields";

function OrganizerRequestCard({ user, setUser }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      setUser(await fn());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (user.role !== "user") {
    return (
      <Card className="p-6 mb-6 bg-leaf/5 border-leaf/30">
        <h2 className="font-display text-xl font-bold uppercase mb-1">Pořádání závodů</h2>
        <p className="text-sm">
          Můžeš zakládat a spravovat závody v <Link to="/admin" className="text-wood font-semibold hover:underline">Správě závodů</Link>.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 mb-6">
      <h2 className="font-display text-xl font-bold uppercase mb-1">Pořádání závodů</h2>
      {error && <p className="text-punch text-sm mb-2">{error}</p>}
      {user.organizer_request_at ? (
        <div className="space-y-3">
          <p className="text-sm">
            ⏳ Žádost o možnost zakládat závody jsi odeslal{" "}
            <strong>{formatDate(user.organizer_request_at.slice(0, 10))}</strong>. Admin ji brzy vyřídí.
          </p>
          {user.organizer_request_note && (
            <p className="text-sm text-forest-700/70 italic">„{user.organizer_request_note}“</p>
          )}
          <Button variant="outline" disabled={busy} onClick={() => run(() => api.cancelOrganizerRequest())}>
            Zrušit žádost
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-forest-700/70">
            Chceš pořádat vlastní závod? Požádej admina o možnost zakládat závody.
          </p>
          <div>
            <Label>Zpráva pro admina (nepovinné)</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="např. jakou štafetu chceš pořádat" />
          </div>
          <Button disabled={busy} onClick={() => run(() => api.requestOrganizer(note))}>
            Požádat o možnost zakládat závody
          </Button>
        </div>
      )}
    </Card>
  );
}

function RacerCodeCard({ code }) {
  const [copied, setCopied] = useState(false);
  if (!code) return null;
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* schránka nemusí být dostupná */
    }
  }
  return (
    <Card className="p-6 mb-6 bg-gold/10 border-gold/50">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-bold uppercase mb-1">Kód závodníka</h2>
          <p className="text-sm text-forest-700/70 max-w-md">
            Dej ho kapitánovi – zadá ho do přihlášky místo e-mailu a výsledky se ti připíšou do účtu i rankingu.
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          title="Zkopírovat"
          className="font-display text-3xl font-bold tracking-[0.2em] bg-white border-2 border-forest-900 rounded-md px-4 py-2 hover:bg-forest-50"
        >
          {code}
          <span className="block text-[10px] tracking-normal font-normal text-forest-700/60">{copied ? "zkopírováno ✓" : "klikni pro zkopírování"}</span>
        </button>
      </div>
    </Card>
  );
}

function DeleteAccountCard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.deleteMe(password);
      logout();
      navigate("/", { replace: true });
    } catch (e2) {
      setError(e2.message);
      setBusy(false);
    }
  }

  return (
    <Card className="p-6 mt-6 border-punch/30">
      <h2 className="font-display text-xl font-bold uppercase mb-1 text-punch">Smazání účtu</h2>
      {!open ? (
        <div className="space-y-3">
          <p className="text-sm text-forest-700/70">Účet a údaje z profilu nenávratně smažeš.</p>
          <Button variant="outline" onClick={() => setOpen(true)}>Smazat účet…</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>smaže se e-mail, jméno, telefon a další údaje profilu,</li>
            <li>tvoje přihlášky na nadcházející závody (kde jsi kapitán) se zruší,</li>
            <li>výsledky proběhlých závodů zůstanou, jen bez vazby na tvůj účet,</li>
            <li>tento krok nejde vrátit.</li>
          </ul>
          {error && <p className="text-punch text-sm">{error}</p>}
          <div className="max-w-xs">
            <Label>Pro potvrzení zadej heslo</Label>
            <Input type="password" required autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <Button type="submit" variant="danger" disabled={busy}>Nenávratně smazat účet</Button>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setPassword(""); setError(""); }}>Zpět</Button>
          </div>
        </form>
      )}
    </Card>
  );
}

export default function AccountPage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    first_name: user.first_name, last_name: user.last_name, birth_year: user.birth_year, club: user.club, phone: user.phone,
    hide_from_ranking: !!user.hide_from_ranking,
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

      <RacerCodeCard code={user.racer_code} />

      <OrganizerRequestCard user={user} setUser={setUser} />

      <Card className="p-6 mb-6">
        <h2 className="font-display text-xl font-bold uppercase mb-1">Profil</h2>
        <p className="text-sm text-forest-700/60 mb-4 font-mono">{user.email}</p>
        <form onSubmit={saveProfile} className="space-y-4">
          {err.profile && <p className="text-punch text-sm">{err.profile}</p>}
          <ProfileFields form={form} update={update} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!form.hide_from_ranking} onChange={(e) => update("hide_from_ranking", !e.target.checked)} />
            Zobrazovat mě v <Link to="/ranking" className="text-wood underline">rankingu závodníků</Link>
          </label>
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

      {user.role !== "admin" && <DeleteAccountCard />}
    </div>
  );
}
