const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function getToken() {
  return localStorage.getItem("voila_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("voila_token", token);
  else localStorage.removeItem("voila_token");
}

export function getUsername() {
  return localStorage.getItem("voila_user") || "";
}

export function setUsername(name) {
  if (name) localStorage.setItem("voila_user", name);
  else localStorage.removeItem("voila_user");
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem("voila_token");
  localStorage.removeItem("voila_user");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    // Set Bearer token when available
    headers.set("Authorization", "Bearer " + token);
  }

  let body = options.body;
  const isFormData = body instanceof FormData;
  if (body && typeof body !== "string" && !isFormData) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers, body });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const json = await res.json();
      detail = json.detail || JSON.stringify(json);
    } catch (_) {
      /* keep statusText */
    }
    throw new Error(detail);
  }

  // Some endpoints may return no content
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (username, password) =>
    request(`/auth/login`, {
      method: "POST",
      body: { username, password },
    }),

  register: (user) =>
    request(`/auth/register`, {
      method: "POST",
      body: user,
    }),

  me: () => request("/auth/me"),

  kpis: ({ time_period, run_id } = {}) => {
    const p = new URLSearchParams();
    if (time_period) p.set("time_period", time_period);
    if (run_id) p.set("run_id", run_id);
    const qs = p.toString();
    return request(`/analytics/kpis${qs ? `?${qs}` : ""}`);
  },

  topics: ({ run_id } = {}) => {
    const p = new URLSearchParams();
    if (run_id) p.set("run_id", run_id);
    const qs = p.toString();
    return request(`/analytics/topics${qs ? `?${qs}` : ""}`);
  },

  trends: (granularity = "daily", run_id) => {
    const p = new URLSearchParams({ granularity });
    if (run_id) p.set("run_id", run_id);
    return request(`/analytics/trends?${p.toString()}`);
  },

  runs: () => request("/analytics/runs"),

  compare: (current_run_id, previous_run_id) =>
    request(
      `/analytics/compare?current_run_id=${encodeURIComponent(current_run_id || "")}&previous_run_id=${encodeURIComponent(previous_run_id || "")}`
    ),

  status: () => request("/analytics/status"),

  ask: (question) => request("/agent/query", { method: "POST", body: { question } }),

  upload: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return request("/upload", { method: "POST", body: fd });
  },
};
