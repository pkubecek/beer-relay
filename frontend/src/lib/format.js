export function formatSeconds(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined) return "—";
  const sign = totalSeconds < 0 ? "-" : "";
  const s = Math.abs(Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${sign}${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${sign}${m}:${String(sec).padStart(2, "0")}`;
}

export function parseTimeToSeconds(input) {
  // accepts "mm:ss", "h:mm:ss", or plain seconds
  if (input === "" || input === null || input === undefined) return null;
  const parts = String(input).trim().split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || isNaN(Number(p)))) return null;
  const nums = parts.map(Number);
  if (nums.length === 1) return nums[0];
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];
  return null;
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
}

export const STATUS_LABELS = {
  draft: "Koncept",
  open: "Přihlášky otevřeny",
  closed: "Přihlášky uzavřeny",
  finished: "Vyhodnoceno",
};

export const TEAM_STATUS_LABELS = {
  pending: "Čeká na schválení",
  approved: "Schváleno",
  rejected: "Zamítnuto",
};

export function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// "2026-05-01T23:59:00" -> "2026-05-01T23:59" pro <input type="datetime-local">
export function toDateTimeInput(value) {
  return value ? String(value).slice(0, 16) : "";
}

export function formatMoney(value) {
  if (value === null || value === undefined) return "";
  return `${value.toLocaleString("cs-CZ")} Kč`;
}

/** Název úseku – když ho pořadatel nevyplnil, použije se „1. úsek“. */
export function legLabel(leg) {
  return leg?.name?.trim() || `${leg?.order}. úsek`;
}

export const ROLE_LABELS = {
  user: "Závodník",
  organizer: "Závodník + pořadatel",
  admin: "Admin",
};

export const EVENT_STATUS_TONE = { draft: "neutral", open: "leaf", closed: "gold", finished: "violet" };
export const TEAM_STATUS_TONE = { pending: "gold", approved: "leaf", rejected: "punch" };

/** „bře 2027“ + „14“ pro dlaždici s datem. */
export function dateParts(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  return {
    day: d.getDate(),
    month: d.toLocaleDateString("cs-CZ", { month: "short" }).replace(".", ""),
    year: d.getFullYear(),
    weekday: d.toLocaleDateString("cs-CZ", { weekday: "long" }),
  };
}

/** „Sobota 14. března 2027“ */
export function formatLongDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const s = d.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** „7. 3.“ */
export function formatShortDate(value) {
  if (!value) return "";
  const d = new Date(value);
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}

/** Kolik dní zbývá do daného okamžiku (null, když už je po něm). */
export function daysLeft(value) {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  if (diff < 0) return null;
  return Math.floor(diff / 86400000);
}

/** „zbývá 12 dní“ / „zbývá 1 den“ / „končí dnes“ */
export function daysLeftLabel(value) {
  const n = daysLeft(value);
  if (n === null) return "uzavřeno";
  if (n === 0) return "končí dnes";
  if (n === 1) return "zbývá 1 den";
  if (n < 5) return `zbývají ${n} dny`;
  return `zbývá ${n} dní`;
}

/** Skloňování: plural(3, "tým", "týmy", "týmů") */
export function plural(n, one, few, many) {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

export function isFull(ev) {
  return !!ev?.max_teams && ev.team_count >= ev.max_teams;
}
