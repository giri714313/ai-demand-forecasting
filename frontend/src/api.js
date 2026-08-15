// Base URL of the FastAPI backend. Set VITE_API_URL when deploying
// (e.g. https://your-backend.onrender.com). Falls back to localhost for dev.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function get(path, params = {}) {
  const url = new URL(API_URL + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
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
  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`POST ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

export const api = {
  health: () => get("/health"),
  dashboardSummary: () => get("/dashboard/summary"),
  backtestResults: () => get("/metrics/backtest"),
  stockoutRisk: (params) => get("/risk/stockout", params),
  overstockRisk: (params) => get("/risk/overstock", params),
  replenishmentRecs: (params) => get("/recommendations/replenishment", params),
  transferRecs: (params) => get("/recommendations/transfers", params),
  forecasts: (params) => get("/forecasts", params),
  train: (params) => post("/pipeline/train", params),
  generateForecasts: (params) => post("/pipeline/generate-forecasts", params),
};

export default api;
