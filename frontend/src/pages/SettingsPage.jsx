import React, { useState } from "react";
import { Loader2, Settings as SettingsIcon, RefreshCw, Play, CheckCircle2, XCircle } from "lucide-react";
import api from "../api";

function NumberField({ label, hint, value, onChange, min = 0, max = 365 }) {
  return (
    <div>
      <label className="text-[13px] font-medium text-gray-700 block mb-1">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800"
      />
      <div className="text-[11px] text-gray-400 mt-1">{hint}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [leadTime, setLeadTime] = useState(5);
  const [safetyBuffer, setSafetyBuffer] = useState(14);
  const [overstockThreshold, setOverstockThreshold] = useState(45);
  const [horizon, setHorizon] = useState(90);
  const [testDays, setTestDays] = useState(30);

  const [trainState, setTrainState] = useState({ status: "idle", result: null, error: null });
  const [forecastState, setForecastState] = useState({ status: "idle", result: null, error: null });

  async function handleRetrain() {
    setTrainState({ status: "loading", result: null, error: null });
    try {
      const result = await api.train({ test_days: testDays });
      setTrainState({ status: "done", result, error: null });
    } catch (e) {
      setTrainState({ status: "error", result: null, error: e.message });
    }
  }

  async function handleRegenerateForecasts() {
    setForecastState({ status: "loading", result: null, error: null });
    try {
      const result = await api.generateForecasts({
        horizon, lead_time_days: leadTime,
        safety_buffer_days: safetyBuffer, overstock_threshold_days: overstockThreshold,
      });
      setForecastState({ status: "done", result, error: null });
    } catch (e) {
      setForecastState({ status: "error", result: null, error: e.message });
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900">Settings</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Risk thresholds and pipeline controls, these call the live API</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-[14px] font-medium text-gray-800 mb-4 flex items-center gap-2">
            <SettingsIcon size={16} className="text-indigo-500" /> Risk and recommendation thresholds
          </div>

          <div className="flex flex-col gap-4">
            <NumberField label="Supplier lead time (days)" hint="Used for HIGH/MEDIUM stockout risk cutoffs"
              value={leadTime} onChange={setLeadTime} min={1} max={60} />
            <NumberField label="Safety buffer (days)" hint="Extra cover added to replenishment order quantities"
              value={safetyBuffer} onChange={setSafetyBuffer} min={0} max={90} />
            <NumberField label="Overstock threshold (days of cover)" hint="Above this, a SKU is flagged overstocked"
              value={overstockThreshold} onChange={setOverstockThreshold} min={7} max={180} />
            <NumberField label="Forecast horizon (days)" hint="How far forward to generate forecasts, max 90"
              value={horizon} onChange={setHorizon} min={7} max={90} />
          </div>

          <button
            onClick={handleRegenerateForecasts}
            disabled={forecastState.status === "loading"}
            className="mt-5 w-full flex items-center justify-center gap-2 bg-indigo-500 text-white rounded-lg px-4 py-2.5 text-[13px] font-medium hover:bg-indigo-600 disabled:opacity-60"
          >
            {forecastState.status === "loading" ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            {forecastState.status === "loading" ? "Regenerating forecasts..." : "Apply and regenerate forecasts"}
          </button>

          {forecastState.status === "done" && (
            <div className="mt-3 flex items-start gap-2 text-[12.5px] text-green-700 bg-green-50 border border-green-100 rounded-lg p-3">
              <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
              <div>
                Done, {forecastState.result.series_forecasted.toLocaleString()} series forecasted.
                {" "}{forecastState.result.high_risk} HIGH, {forecastState.result.medium_risk} MEDIUM risk,
                {" "}{forecastState.result.overstocked} overstocked,
                {" "}{forecastState.result.replenishment_recs} replenishment and {forecastState.result.transfer_recs} transfer recs generated.
              </div>
            </div>
          )}
          {forecastState.status === "error" && (
            <div className="mt-3 flex items-start gap-2 text-[12.5px] text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
              <XCircle size={15} className="shrink-0 mt-0.5" /> {forecastState.error}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-[14px] font-medium text-gray-800 mb-4 flex items-center gap-2">
            <Play size={16} className="text-purple-500" /> Retrain model
          </div>
          <p className="text-[13px] text-gray-500 mb-4">
            Re-runs feature engineering and trains a fresh LightGBM model against whatever data is
            currently in the database, backtesting against baselines on a held-out window.
          </p>

          <NumberField label="Backtest window (days)" hint="Most recent N days held out for testing"
            value={testDays} onChange={setTestDays} min={7} max={90} />

          <button
            onClick={handleRetrain}
            disabled={trainState.status === "loading"}
            className="mt-5 w-full flex items-center justify-center gap-2 bg-purple-500 text-white rounded-lg px-4 py-2.5 text-[13px] font-medium hover:bg-purple-600 disabled:opacity-60"
          >
            {trainState.status === "loading" ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
            {trainState.status === "loading" ? "Training..." : "Retrain model"}
          </button>

          {trainState.status === "done" && (
            <div className="mt-3 flex flex-col gap-1.5 text-[12.5px] text-green-700 bg-green-50 border border-green-100 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                <div>
                  Trained on {trainState.result.rows_trained.toLocaleString()} rows, tested on {trainState.result.rows_tested.toLocaleString()}.
                </div>
              </div>
              {trainState.result.results.map((r) => (
                <div key={r.model} className="pl-6 text-gray-600">
                  {r.model}: WAPE {(r.wape * 100).toFixed(1)}%
                </div>
              ))}
            </div>
          )}
          {trainState.status === "error" && (
            <div className="mt-3 flex items-start gap-2 text-[12.5px] text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
              <XCircle size={15} className="shrink-0 mt-0.5" /> {trainState.error}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-gray-100 text-[11px] text-gray-400">
            Note: retraining doesn't automatically regenerate forecasts, run "Apply and regenerate
            forecasts" on the left afterward to refresh recommendations using the new model.
          </div>
        </div>
      </div>
    </div>
  );
}
