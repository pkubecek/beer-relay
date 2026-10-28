import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Card, PageHero, Progress, SectionTitle, Segmented, StatTile } from "../components/ui";
import {
  daysLeftLabel,
  formatDateTime,
  formatLongDate,
  formatMoney,
  isFull,
  legLabel,
  plural,
} from "../lib/format";
import EntriesList from "../components/EntriesList";
import ResultsTable from "../components/ResultsTable";
import RouteLine from "../components/RouteLine";
import { EventStatusBadge } from "../components/EventCard";
import { EventMap } from "../components/Map";

function Fact({ label, children }) {
  if (!children) return null;
  return (
    <div className="flex gap-3 py-2.5 border-b border-line last:border-0 text-sm">
      <dt className="w-32 shrink-0 text-[11px] uppercase tracking-wider font-semibold text-forest-700/50 pt-0.5">{label}</dt>
      <dd className="flex-1 min-w-0">{children}</dd>
    </div>
  );
}

function deadlineValue(value) {
  const d = new Date(value);
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}`;
}

function HeroActions({ event }) {
  const { user } = useAuth();
  const location = useLocation();
  const manage = event.can_manage && (
    <Link
      to={`/admin/zavody/${event.slug}`}
      className="rounded-xl border border-white/20 hover:border-gold hover:text-gold px-4 py-3 text-sm font-semibold transition-colors"
    >
      Spravovat závod
    </Link>
  );

  if (event.status === "finished") return manage || null;

  if (!event.registration_open || isFull(event)) {
    return (
      <>
        <p className="text-sm text-foam/60">{event.registration_message || (isFull(event) ? "Kapacita závodu je naplněná." : "Přihlášky nejsou otevřené.")}</p>
        {manage}
      </>
    );
  }

  const target = `${location.pathname}/prihlaska`;
  return (
    <>
      {user ? (
        <Link to={`/zavody/${event.slug}/prihlaska`} className="rounded-xl bg-gold hover:bg-gold-600 text-forest-900 font-semibold px-6 py-3 transition-colors shadow-sm">
          Přihlásit tým
        </Link>
      ) : (
        <>
          <Link
            to={`/prihlaseni?next=${encodeURIComponent(target)}`}
            className="rounded-xl bg-gold hover:bg-gold-600 text-forest-900 font-semibold px-6 py-3 transition-colors shadow-sm"
          >
            Přihlásit tým
          </Link>
          <Link to={`/registrace?next=${encodeURIComponent(target)}`} className="text-sm text-foam/70 underline underline-offset-2 hover:text-gold">
            nemáš účet? Založ si ho
          </Link>
        </>
      )}
      {manage}
    </>
  );
}

function StatTiles({ event }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatTile
        label="Start"
        value={event.start_time || "—"}
        note={event.event_date ? formatLongDate(event.event_date).split(" ").slice(0, 3).join(" ") : "termín upřesníme"}
      />
      <StatTile
        label="Uzávěrka přihlášek"
        value={event.entry_deadline ? deadlineValue(event.entry_deadline) : "—"}
        note={event.entry_deadline ? daysLeftLabel(event.entry_deadline) : "bez uzávěrky"}
      />
      <StatTile
        label="Startovné"
        value={event.entry_fee != null ? formatMoney(event.entry_fee) : "—"}
        note={event.entry_fee != null ? "za tým" : "neuvedeno"}
      />
      <StatTile
        label="Kapacita"
        value={`${event.team_count}${event.max_teams ? ` / ${event.max_teams}` : ""} ${plural(event.max_teams || event.team_count, "tým", "týmy", "týmů")}`}
        note={!event.max_teams ? "bez omezení" : isFull(event) ? "naplněno" : null}
      >
        {event.max_teams ? <Progress value={event.team_count} max={event.max_teams} className="mt-2" /> : null}
      </StatTile>
    </div>
  );
}

export default function EventPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [legs, setLegs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [entries, setEntries] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);
  const [tab, setTab] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getEvent(slug)
      .then((ev) => {
        setEvent(ev);
        setTab((t) => t ?? (ev.status === "finished" ? "results" : "info"));
        return Promise.all([api.listLegs(ev.id), api.listCategories(ev.id), api.listEntries(ev.id)]);
      })
      .then(([legsData, catsData, entriesData]) => {
        setLegs(legsData);
        setCategories(catsData);
        setEntries(entriesData);
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  useEffect(() => {
    if (tab === "results" && event) {
      api.getLeaderboard(event.id).then(setLeaderboard).catch((e) => setError(e.message));
    }
  }, [tab, event]);

  if (error) return <p className="text-punch">{error}</p>;
  if (!event) return <p className="text-forest-700/60">Načítám…</p>;

  const finished = event.status === "finished";
  const tabs = [
    { key: "info", label: "Informace" },
    { key: "entries", label: `Přihlášky · ${entries.length}` },
    { key: "results", label: "Výsledky" },
  ];

  const chips = [
    legs.length > 0 && `${legs.length} ${plural(legs.length, "úsek", "úseky", "úseků")}`,
    categories.length > 0 && `${categories.length} ${plural(categories.length, "kategorie", "kategorie", "kategorií")}`,
  ].filter(Boolean);

  const subtitle = finished
    ? [
        event.event_date && new Date(event.event_date + "T00:00:00").toLocaleDateString("cs-CZ"),
        event.location,
        `${event.team_count} ${plural(event.team_count, "tým", "týmy", "týmů")}`,
        legs.length > 0 && `${legs.length} ${plural(legs.length, "úsek", "úseky", "úseků")}`,
      ]
    : [event.event_date && formatLongDate(event.event_date), event.location, event.organizer_name && `pořádá ${event.organizer_name}`];

  return (
    <div>
      <PageHero
        overlap
        crumbs={[finished ? { label: "Výsledky", to: "/vysledky" } : { label: "Kalendář závodů", to: "/" }, { label: event.name }]}
        badges={
          <>
            <EventStatusBadge event={event} long={false} />
            {!finished && chips.length > 0 && (
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-foam/80">{chips.join(" · ")}</span>
            )}
          </>
        }
        eyebrow={finished ? "Oficiální výsledková listina" : null}
        title={event.name}
        subtitle={subtitle.filter(Boolean).join(" · ")}
        actions={<HeroActions event={event} />}
      />

      {!finished && (
        <div className="mb-6">
          <StatTiles event={event} />
        </div>
      )}

      <Segmented options={tabs} value={tab} onChange={setTab} className="mb-6" />

      {tab === "info" && (
        <div className="grid lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-3 space-y-6">
            {finished && <StatTiles event={event} />}
            {event.description && (
              <Card className="p-5 sm:p-6">
                <SectionTitle>O závodě</SectionTitle>
                <p className="text-forest-700/90 whitespace-pre-line leading-relaxed">{event.description}</p>
              </Card>
            )}
            <Card className="p-5 sm:p-6">
              <SectionTitle>Podrobnosti</SectionTitle>
              <dl>
                <Fact label="Datum">
                  {event.event_date && `${formatLongDate(event.event_date)}${event.start_time ? `, start ${event.start_time}` : ""}`}
                </Fact>
                <Fact label="Místo">{event.location}</Fact>
                <Fact label="Pořadatel">{event.organizer_name}</Fact>
                <Fact label="Kontakt">
                  {event.contact_email && (
                    <a className="underline underline-offset-2 hover:text-wood" href={`mailto:${event.contact_email}`}>
                      {event.contact_email}
                    </a>
                  )}
                </Fact>
                <Fact label="Web">
                  {event.website && (
                    <a className="underline underline-offset-2 hover:text-wood break-all" href={event.website} target="_blank" rel="noreferrer">
                      {event.website}
                    </a>
                  )}
                </Fact>
                <Fact label="Přihlášky od">{event.entries_open_at && formatDateTime(event.entries_open_at)}</Fact>
                <Fact label="Uzávěrka">{event.entry_deadline && formatDateTime(event.entry_deadline)}</Fact>
                <Fact label="Kategorie">{categories.length > 0 && categories.map((c) => c.name).join(", ")}</Fact>
              </dl>
            </Card>
          </div>
          <div className="lg:col-span-2 space-y-6">
            {event.lat != null && event.lon != null && (
              <Card className="p-5 sm:p-6">
                <SectionTitle>Místo</SectionTitle>
                <div className="rounded-xl overflow-hidden">
                  <EventMap lat={event.lat} lon={event.lon} label={event.location} />
                </div>
              </Card>
            )}
            <Card className="p-5 sm:p-6">
              <SectionTitle>Úseky štafety</SectionTitle>
              {legs.length === 0 ? (
                <p className="text-forest-700/60 text-sm">Úseky ještě nejsou zveřejněné.</p>
              ) : (
                <RouteLine
                  legs={legs}
                  renderLeg={(leg) => (
                    <div>
                      <p className="font-semibold text-sm">{legLabel(leg)}</p>
                      {leg.description && <p className="text-xs text-forest-700/60">{leg.description}</p>}
                    </div>
                  )}
                />
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === "entries" && (
        <Card className="p-5 sm:p-6">
          <EntriesList teams={entries} legs={legs} categories={categories} />
        </Card>
      )}

      {tab === "results" && <ResultsTable data={leaderboard} />}
    </div>
  );
}
