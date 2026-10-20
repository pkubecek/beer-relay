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

export const EVENT_STATUS_TONE = { draft: "neutral", open: "leaf", closed: "gold", finished: "neutral" };
export const TEAM_STATUS_TONE = { pending: "gold", approved: "leaf", rejected: "punch" };
