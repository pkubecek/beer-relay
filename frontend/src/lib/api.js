const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("admin_token");
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = `Chyba ${res.status}`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch (_) {
      /* noop */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // auth
  login: (password) => request("/api/auth/login", { method: "POST", body: { password } }),

  // events
  listEvents: () => request("/api/events"),
  listEventsAdmin: () => request("/api/events/admin", { auth: true }),
  getEvent: (slug) => request(`/api/events/${slug}`),
  getEventAdmin: (slug) => request(`/api/events/${slug}/admin`, { auth: true }),
  createEvent: (data) => request("/api/events", { method: "POST", body: data, auth: true }),
  updateEvent: (id, data) => request(`/api/events/${id}`, { method: "PATCH", body: data, auth: true }),
  deleteEvent: (id) => request(`/api/events/${id}`, { method: "DELETE", auth: true }),

  // legs
  listLegs: (eventId) => request(`/api/events/${eventId}/legs`),
  createLeg: (eventId, data) => request(`/api/events/${eventId}/legs`, { method: "POST", body: data, auth: true }),
  updateLeg: (legId, data) => request(`/api/events/legs/${legId}`, { method: "PATCH", body: data, auth: true }),
  deleteLeg: (legId) => request(`/api/events/legs/${legId}`, { method: "DELETE", auth: true }),

  // teams
  listApprovedTeams: (eventId) => request(`/api/events/${eventId}/teams`),
  listAllTeamsAdmin: (eventId) => request(`/api/events/${eventId}/teams/admin`, { auth: true }),
  registerTeam: (eventId, data) => request(`/api/events/${eventId}/teams`, { method: "POST", body: data }),
  setTeamStatus: (teamId, status) =>
    request(`/api/teams/${teamId}/status`, { method: "PATCH", body: { status }, auth: true }),
  deleteTeam: (teamId) => request(`/api/teams/${teamId}`, { method: "DELETE", auth: true }),

  // results
  upsertResult: (data) => request("/api/results", { method: "PUT", body: data, auth: true }),
  getLeaderboard: (eventId) => request(`/api/events/${eventId}/results`),
  getAllResultsAdmin: (eventId) => request(`/api/events/${eventId}/results/admin`, { auth: true }),
};

export function setToken(token) {
  localStorage.setItem("admin_token", token);
}

export function clearToken() {
  localStorage.removeItem("admin_token");
}

export function isLoggedIn() {
  return !!getToken();
}
