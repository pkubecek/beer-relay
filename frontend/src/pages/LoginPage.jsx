import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button, Card, Input, Label } from "../components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-6">
      <h1 className="font-display text-3xl font-extrabold uppercase mb-6 text-center">Přihlášení</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-punch text-sm">{error}</p>}
          <div>
            <Label>E-mail</Label>
            <Input type="email" required autoFocus autoComplete="email" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <Label>Heslo</Label>
            <Input type="password" required autoComplete="current-password" value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Přihlašuji…" : "Přihlásit se"}
          </Button>
        </form>
      </Card>
      <p className="text-sm text-center mt-4 text-forest-700/70">
        Ještě nemáš účet?{" "}
        <Link to={`/registrace${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-wood font-semibold hover:underline">
          Zaregistruj se
        </Link>
      </p>
      <p className="text-xs text-center mt-2 text-forest-700/50">Zapomenuté heslo ti obnoví pořadatel nebo admin.</p>
    </div>
  );
}
