import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button, Card, Input, Label } from "../components/ui";
import ProfileFields from "../components/ProfileFields";

export default function RegisterPage() {
  const { register } = useAuth();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", password2: "", first_name: "", last_name: "", birth_year: null, club: "", phone: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.password2) {
      setError("Hesla se neshodují");
      return;
    }
    setSubmitting(true);
    try {
      // eslint-disable-next-line no-unused-vars
      const { password2, ...data } = form;
      await register(data);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-6">
      <h1 className="font-display text-3xl font-extrabold uppercase mb-2 text-center">Registrace</h1>
      <p className="text-center text-sm text-forest-700/70 mb-6">S účtem můžeš přihlašovat týmy a upravovat přihlášky do uzávěrky.</p>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-punch text-sm">{error}</p>}
          <div>
            <Label>E-mail</Label>
            <Input type="email" required autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Heslo (min. 8 znaků)</Label>
              <Input type="password" required minLength={8} autoComplete="new-password" value={form.password}
                onChange={(e) => update("password", e.target.value)} />
            </div>
            <div>
              <Label>Heslo znovu</Label>
              <Input type="password" required minLength={8} autoComplete="new-password" value={form.password2}
                onChange={(e) => update("password2", e.target.value)} />
            </div>
          </div>
          <ProfileFields form={form} update={update} />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Zakládám účet…" : "Vytvořit účet"}
          </Button>
        </form>
      </Card>
      <p className="text-sm text-center mt-4 text-forest-700/70">
        Už máš účet?{" "}
        <Link to={`/prihlaseni${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-wood font-semibold hover:underline">
          Přihlas se
        </Link>
      </p>
    </div>
  );
}
