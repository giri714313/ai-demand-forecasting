// Base URL of the FastAPI backend. Set VITE_API_URL when deploying
// (e.g. https://your-backend.onrender.com). Falls back to localhost for dev.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TOKEN_KEY = "ai_demand_forecasting_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function get(path, params = {}) {
  const url = new URL(API_URL + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GET ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function post(path, params = {}) {
  const url = new URL(API_URL + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), { method: "POST", headers: authHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`POST ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function postJson(path, jsonBody) {
  const res = await fetch(API_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(jsonBody),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `POST ${path} failed: ${res.status}`);
  }
  return data;
}

async function del(path) {
  const res = await fetch(API_URL + path, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`DELETE ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

export const api = {
  health: () => get("/health"),
  dashboardSummary: () => get("/dashboard/summary"),
  dataStats: () => get("/dashboard/data-stats"),
  backtestResults: () => get("/metrics/backtest"),
  stores: () => get("/stores"),
  products: () => get("/products"),
  stockoutRisk: (params) => get("/risk/stockout", params),
  overstockRisk: (params) => get("/risk/overstock", params),
  replenishmentRecs: (params) => get("/recommendations/replenishment", params),
  transferRecs: (params) => get("/recommendations/transfers", params),
  forecasts: (params) => get("/forecasts", params),
  train: (params) => post("/pipeline/train", params),
  generateForecasts: (params) => post("/pipeline/generate-forecasts", params),
  resetData: () => del("/ingest/reset"),

  signup: (payload) => postJson("/auth/signup", payload),
  login: (payload) => postJson("/auth/login", payload),
  me: () => get("/auth/me"),
};

export default api;
