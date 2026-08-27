import { useState } from "react";
import { api } from "../lib/api";
import { Button, Input, Label, Textarea } from "./ui";

export default function TeamRegistrationForm({ eventId, onRegistered }) {
  const [form, setForm] = useState({
    name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    members: "",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.registerTeam(eventId, form);
      setDone(true);
      onRegistered?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="p-5 bg-leaf/10 border border-leaf/30 rounded-md text-leaf font-medium">
        🎉 Tým je přihlášen! Teď čeká na schválení pořadatelem — sledujte e-mail.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-punch text-sm font-medium">{error}</p>}
      <div>
        <Label>Název týmu</Label>
        <Input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Lesní vlci" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Kontaktní osoba</Label>
          <Input
            required
            value={form.contact_name}
            onChange={(e) => update("contact_name", e.target.value)}
            placeholder="Jméno a příjmení"
          />
        </div>
        <div>
          <Label>Telefon</Label>
          <Input value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} placeholder="+420…" />
        </div>
      </div>
      <div>
        <Label>E-mail</Label>
        <Input
          required
          type="email"
          value={form.contact_email}
          onChange={(e) => update("contact_email", e.target.value)}
          placeholder="tym@email.cz"
        />
      </div>
      <div>
        <Label>Členové týmu (jméno na úsek)</Label>
        <Textarea
          rows={3}
          value={form.members}
          onChange={(e) => update("members", e.target.value)}
          placeholder={"1. úsek: Petr Novák\n2. úsek: Jana Malá\n…"}
        />
      </div>
      <div>
        <Label>Poznámka</Label>
        <Textarea rows={2} value={form.note} onChange={(e) => update("note", e.target.value)} />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Přihlašuji…" : "Přihlásit tým"}
      </Button>
    </form>
  );
}
