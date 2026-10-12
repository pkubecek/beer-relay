// Produkce: API se volá přes stejnou doménu (/api/...) a Vercel ho přepošle na Railway
// (viz vercel.json) – žádné CORS. Lokálně se volá backend přímo.
const BASE_URL = import.meta.env.DEV ? import.meta.env.VITE_API_URL || "http://localhost:8000" : "";
const TOKEN_KEY = "auth_token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* noop */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("admin_token"); // starý klíč z verze 1
  } catch {
    /* noop */
  }
}

// Zavolá se při 401 – AuthProvider si sem zaregistruje odhlášení.
let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

function formatDetail(detail, status) {
  if (!detail) return `Chyba ${status}`;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    // chyby validace z FastAPI
    return detail
      .map((d) => {
        const field = d.loc?.[d.loc.length - 1];
        if (d.type === "string_too_short" && field === "password") return "Heslo musí mít alespoň 8 znaků";
        if (field === "email") return "Neplatný e-mail";
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .join(", ");
  }
  return `Chyba ${status}`;
}

async function request(path, { method = "GET", body, raw = false } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail;
    try {
      detail = (await res.json()).detail;
    } catch {
      /* noop */
    }
    if (res.status === 401 && token) onUnauthorized();
    throw new Error(formatDetail(detail, res.status));
  }
  if (raw) return res;
  if (res.status === 204) return null;
  return res.json();
}

function qs(params) {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
  const str = s.toString();
  return str ? `?${str}` : "";
}

export const api = {
  // účet
  register: (data) => request("/api/auth/register", { method: "POST", body: data }),
  login: (email, password) => request("/api/auth/login", { method: "POST", body: { email, password } }),
  me: () => request("/api/auth/me"),
  updateMe: (data) => request("/api/auth/me", { method: "PATCH", body: data }),
  changePassword: (current_password, new_password) =>
    request("/api/auth/me/password", { method: "POST", body: { current_password, new_password } }),

  // uživatelé (admin)
  listUsers: (params = {}) => request(`/api/users${qs(params)}`),
  updateUser: (id, data) => request(`/api/users/${id}`, { method: "PATCH", body: data }),

  // závody
  listEvents: (params = {}) => request(`/api/events${qs(params)}`),
  listManagedEvents: () => request("/api/events/manage"),
  getEvent: (slug) => request(`/api/events/${slug}`),
  createEvent: (data) => request("/api/events", { method: "POST", body: data }),
  updateEvent: (id, data) => request(`/api/events/${id}`, { method: "PATCH", body: data }),
  deleteEvent: (id) => request(`/api/events/${id}`, { method: "DELETE" }),

  // úseky
  listLegs: (eventId) => request(`/api/events/${eventId}/legs`),
  createLeg: (eventId, data) => request(`/api/events/${eventId}/legs`, { method: "POST", body: data }),
  updateLeg: (legId, data) => request(`/api/events/legs/${legId}`, { method: "PATCH", body: data }),
  deleteLeg: (legId) => request(`/api/events/legs/${legId}`, { method: "DELETE" }),

  // kategorie
  listCategories: (eventId) => request(`/api/events/${eventId}/categories`),
  createCategory: (eventId, data) => request(`/api/events/${eventId}/categories`, { method: "POST", body: data }),
  updateCategory: (id, data) => request(`/api/events/categories/${id}`, { method: "PATCH", body: data }),
  deleteCategory: (id) => request(`/api/events/categories/${id}`, { method: "DELETE" }),

  // přihlášky
  listEntries: (eventId) => request(`/api/events/${eventId}/entries`),
  createEntry: (eventId, data) => request(`/api/events/${eventId}/entries`, { method: "POST", body: data }),
  getEntry: (teamId) => request(`/api/entries/${teamId}`),
  updateEntry: (teamId, data) => request(`/api/entries/${teamId}`, { method: "PUT", body: data }),
  deleteEntry: (teamId) => request(`/api/entries/${teamId}`, { method: "DELETE" }),
  myEntries: () => request("/api/me/entries"),
  listEntriesManage: (eventId) => request(`/api/events/${eventId}/entries/manage`),
  manageEntry: (teamId, data) => request(`/api/entries/${teamId}/manage`, { method: "PATCH", body: data }),
  assignStartNumbers: (eventId, data) => request(`/api/events/${eventId}/start-numbers`, { method: "POST", body: data }),
  async downloadEntriesCsv(eventId, filename = "prihlasky.csv") {
    const res = await request(`/api/events/${eventId}/entries.csv`, { raw: true });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // výsledky
  upsertResult: (data) => request("/api/results", { method: "PUT", body: data }),
  getLeaderboard: (eventId) => request(`/api/events/${eventId}/results`),
  getResultsManage: (eventId) => request(`/api/events/${eventId}/results/manage`),
};
