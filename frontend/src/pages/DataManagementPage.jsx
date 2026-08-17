import React, { useState, useEffect } from "react";
import { Loader2, Database, Trash2, AlertOctagon } from "lucide-react";
import api from "../api";

export default function DataManagementPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  function load() {
    setLoading(true);
    api.dataStats().then(setStats).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleReset() {
    setResetting(true);
    try {
      await api.resetData();
      setResetDone(true);
      setConfirming(false);
      load();
    } finally {
      setResetting(false);
    }
  }

  const rows = stats ? [
    { label: "Stores", value: stats.stores },
    { label: "Products", value: stats.products },
    { label: "Sales records", value: stats.sales_rows },
    { label: "Inventory records", value: stats.inventory_rows },
    { label: "Forecast rows (90-day, all series)", value: stats.forecast_rows },
    { label: "Risk score rows", value: stats.risk_score_rows },
    { label: "Recommendation rows", value: stats.recommendation_rows },
    { label: "Backtest model results", value: stats.backtest_rows },
  ] : [];

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900">Data Management</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">What's currently loaded in the database</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 className="animate-spin" size={18} /> Loading...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-[14px] font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Database size={16} className="text-indigo-500" /> Table row counts
            </div>
            <div className="flex flex-col divide-y divide-gray-50">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between py-2 text-[13px]">
                  <span className="text-gray-600">{r.label}</span>
                  <span className="font-medium text-gray-900">{r.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-[14px] font-medium text-gray-800 mb-3 flex items-center gap-2">
              <AlertOctagon size={16} className="text-red-500" /> Reset all data
            </div>
            <p className="text-[13px] text-gray-500 mb-4">
              Wipes stores, products, sales, inventory, forecasts, risk scores, and recommendations.
              Use this before loading a different retailer's dataset. This action is irreversible —
              you'd need to re-run ingest and the pipeline afterward.
            </p>

            {resetDone && (
              <div className="text-[12px] text-green-600 mb-3">Data cleared successfully.</div>
            )}

            {!confirming ? (
              <button
                onClick={() => { setConfirming(true); setResetDone(false); }}
                className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-2 text-[13px] font-medium hover:bg-red-100"
              >
                <Trash2 size={14} /> Reset all data
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="text-[13px] text-red-600 font-medium">Are you sure? This can't be undone.</div>
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    disabled={resetting}
                    className="flex items-center gap-2 bg-red-500 text-white rounded-lg px-4 py-2 text-[13px] font-medium hover:bg-red-600 disabled:opacity-60"
                  >
                    {resetting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                    {resetting ? "Clearing..." : "Yes, clear everything"}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    className="bg-gray-100 text-gray-600 rounded-lg px-4 py-2 text-[13px] font-medium hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
