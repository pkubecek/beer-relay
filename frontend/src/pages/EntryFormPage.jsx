import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button, Card } from "../components/ui";
import { formatDate, formatDateTime, formatMoney } from "../lib/format";
import TeamRegistrationForm from "../components/TeamRegistrationForm";

export default function EntryFormPage() {
  const { slug, teamId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [legs, setLegs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [entry, setEntry] = useState(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const isEdit = !!teamId;

  useEffect(() => {
    api
      .getEvent(slug)
      .then(async (ev) => {
        const [l, c, e] = await Promise.all([
          api.listLegs(ev.id),
          api.listCategories(ev.id),
          isEdit ? api.getEntry(teamId) : Promise.resolve(null),
        ]);
        setLegs(l);
        setCategories(c);
        setEntry(e);
        setEvent(ev);
      })
      .catch((e) => setError(e.message));
  }, [slug, teamId, isEdit]);

  async function handleSubmit(data) {
    if (isEdit) {
      await api.updateEntry(teamId, data);
      navigate("/moje-prihlasky");
    } else {
      setDone(await api.createEntry(event.id, data));
    }
  }

  async function handleDelete() {
    if (!confirm("Opravdu zrušit přihlášku týmu?")) return;
    try {
      await api.deleteEntry(teamId);
      navigate("/moje-prihlasky");
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <p className="text-punch">{error}</p>;
  if (!event) return <p className="text-forest-700/60">Načítám…</p>;

  if (done) {
    return (
      <Card className="p-6 max-w-xl">
        <p className="font-display text-2xl font-bold uppercase mb-2">🎉 Tým {done.name} je přihlášen!</p>
        <p className="text-sm text-forest-700/80 mb-4">
          {done.status === "pending"
            ? "Přihláška teď čeká na schválení pořadatelem."
            : "Přihláška je rovnou potvrzená."}{" "}
          {event.entry_fee != null && `Startovné ${formatMoney(event.entry_fee)} za tým – pokyny k platbě dá pořadatel.`}
        </p>
        <div className="flex gap-3 flex-wrap">
          <Link to="/moje-prihlasky"><Button>Moje přihlášky</Button></Link>
          <Link to={`/zavody/${event.slug}`}><Button variant="outline">Zpět na závod</Button></Link>
        </div>
      </Card>
    );
  }

  const canEdit = !isEdit || event.can_manage || (entry?.captain_id === user.id && event.status === "open" &&
    !(event.entry_deadline && new Date(event.entry_deadline) < new Date()));

  return (
    <div className="max-w-3xl">
      <Link to={`/zavody/${event.slug}`} className="text-sm text-wood hover:underline">← {event.name}</Link>
      <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight mt-2">
        {isEdit ? "Úprava přihlášky" : "Přihláška týmu"}
      </h1>
      <p className="text-sm text-forest-700/70 font-mono mb-6">
        {event.event_date && formatDate(event.event_date)}
        {event.entry_deadline && ` · uzávěrka ${formatDateTime(event.entry_deadline)}`}
        {event.entry_fee != null && ` · startovné ${formatMoney(event.entry_fee)}`}
      </p>

      {!isEdit && !event.registration_open && !event.can_manage ? (
        <Card className="p-5 text-sm">{event.registration_message}</Card>
      ) : !canEdit ? (
        <Card className="p-5 text-sm">Tuto přihlášku už měnit nemůžeš. Pro změny kontaktuj pořadatele.</Card>
      ) : (
        <Card className="p-5">
          {!isEdit && (
            <p className="text-sm text-forest-700/70 mb-4">
              Přihlašuješ jako kapitán <strong>{user.first_name} {user.last_name}</strong> ({user.email}).
            </p>
          )}
          <TeamRegistrationForm
            legs={legs}
            categories={categories}
            initial={entry}
            user={user}
            onSubmit={handleSubmit}
            submitLabel={isEdit ? "Uložit změny" : "Přihlásit tým"}
          />
          {isEdit && (
            <div className="border-t border-wood/20 mt-6 pt-4">
              <Button variant="danger" onClick={handleDelete}>Zrušit přihlášku</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
