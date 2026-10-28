import { Link } from "react-router-dom";
import { Badge, Card, Progress } from "./ui";
import { dateParts, formatShortDate, isFull, STATUS_LABELS } from "../lib/format";

/** Stavová „pilulka“ závodu – stejná v kalendáři i v detailu. */
export function EventStatusBadge({ event, long = true }) {
  if (event.status === "finished") return <Badge tone="violet">Vyhodnoceno</Badge>;
  if (event.status === "draft") return <Badge>Koncept</Badge>;
  if (event.registration_open) {
    if (isFull(event)) return <Badge tone="punch">Kapacita naplněna</Badge>;
    return (
      <Badge tone="leaf">
        {long && event.entry_deadline ? `Přihlášky otevřeny do ${formatShortDate(event.entry_deadline)}` : "Otevřeno"}
      </Badge>
    );
  }
  if (event.status === "open") {
    if (isFull(event)) return <Badge tone="punch">Kapacita naplněna</Badge>;
    return <Badge>{event.entries_open_at && new Date(event.entries_open_at) > new Date() ? "Připravujeme" : "Přihlášky zavřeny"}</Badge>;
  }
  return <Badge tone="gold">{STATUS_LABELS[event.status]}</Badge>;
}

/** Dlaždice s datem: velké číslo dne + „bře 2027“. */
export function DateTile({ value, className = "" }) {
  const p = dateParts(value);
  return (
    <div className={`w-16 h-16 shrink-0 rounded-xl bg-gold-50 border border-gold/30 flex flex-col items-center justify-center ${className}`}>
      {p ? (
        <>
          <span className="font-display text-2xl font-extrabold leading-none tabular">{p.day}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-forest-700/60 mt-1">
            {p.month} {p.year}
          </span>
        </>
      ) : (
        <span className="text-[10px] text-forest-700/50 text-center leading-tight">bez<br />data</span>
      )}
    </div>
  );
}

export default function EventCard({ event: ev }) {
  const full = isFull(ev);
  const primary = ev.registration_open && !full;
  return (
    <Card className="p-4 sm:p-5 hover:shadow-lift hover:border-gold/60 transition-all">
      <div className="flex items-start sm:items-center gap-4">
        <Link to={`/zavody/${ev.slug}`} tabIndex={-1}>
          <DateTile value={ev.event_date} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <EventStatusBadge event={ev} />
            {ev.start_time && <span className="text-xs text-forest-700/50">start {ev.start_time}</span>}
          </div>
          <Link to={`/zavody/${ev.slug}`} className="block">
            <h2 className="font-display text-xl font-bold tracking-tight leading-tight hover:text-wood transition-colors">{ev.name}</h2>
          </Link>
          <p className="text-sm text-forest-700/60 mt-0.5 truncate">
            {[ev.location, ev.organizer_name && `pořádá ${ev.organizer_name}`].filter(Boolean).join(" · ") || " "}
          </p>
          <div className="flex items-center gap-3 mt-2.5 max-w-sm">
            {ev.max_teams ? <Progress value={ev.team_count} max={ev.max_teams} className="flex-1" /> : null}
            <span className="text-xs text-forest-700/60 whitespace-nowrap tabular">
              {ev.team_count}
              {ev.max_teams ? ` / ${ev.max_teams}` : ""} týmů
            </span>
          </div>
        </div>
        <Link
          to={`/zavody/${ev.slug}`}
          className={`hidden sm:inline-flex shrink-0 items-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            primary
              ? "bg-gold hover:bg-gold-600 text-forest-900 shadow-sm"
              : "border border-line bg-white hover:border-forest-900"
          }`}
        >
          {primary ? "Detail a přihláška" : ev.status === "finished" ? "Výsledky" : "Detail závodu"}
        </Link>
      </div>
    </Card>
  );
}
