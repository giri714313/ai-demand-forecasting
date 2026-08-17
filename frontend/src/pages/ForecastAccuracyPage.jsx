import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Loader2, Target } from "lucide-react";
import api from "../api";

const METRIC_INFO = {
  MAE: "Mean Absolute Error — average size of the forecast error, in units. Lower is better.",
  RMSE: "Root Mean Squared Error — like MAE but penalizes large misses more heavily. Lower is better.",
  WAPE: "Weighted Absolute Percentage Error — total error as a % of total actual demand. The main metric used to compare models here.",
  Bias: "Whether the model over-forecasts (positive) or under-forecasts (negative) on average. Closer to 0% is better.",
};

export default function ForecastAccuracyPage() {
  const [backtest, setBacktest] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.backtestResults().then(setBacktest).finally(() => setLoading(false));
  }, []);

  const chartData = backtest.map((r) => ({ model: r.model.replace("Baseline: ", "").replace("Model: ", ""), wape: +(r.wape * 100).toFixed(1) }));
  const best = backtest[0];
  const worst = backtest[backtest.length - 1];
  const improvement = best && worst ? (((worst.wape - best.wape) / worst.wape) * 100).toFixed(1) : null;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900">Forecast Accuracy</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Model backtest — held out the last 30 days, trained on everything before it</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 className="animate-spin" size={18} /> Loading...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 md:col-span-2">
              <div className="text-[14px] font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Target size={16} className="text-indigo-500" /> WAPE by model (lower is better)
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F5" vertical={false} />
                  <XAxis dataKey="model" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }} />
                  <Bar dataKey="wape" radius={[6, 6, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.model.includes("LightGBM") ? "#4F46E5" : "#C7D2FE"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4">
              <div className="text-[13px] font-medium text-indigo-700 mb-1">Best model</div>
              <div className="text-xl font-medium text-gray-900">{best?.model.replace("Model: ", "")}</div>
              <div className="text-[12px] text-gray-500 mt-1">WAPE {(best?.wape * 100).toFixed(1)}%</div>
              {improvement && (
                <div className="text-[12px] text-green-600 mt-3 font-medium">
                  {improvement}% lower error than the weakest baseline
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-[14px] font-medium text-gray-800 mb-3">Full comparison</div>
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-100">
                  <th className="font-normal pb-2 pr-4">Model</th>
                  <th className="font-normal pb-2 pr-4 text-right">MAE</th>
                  <th className="font-normal pb-2 pr-4 text-right">RMSE</th>
                  <th className="font-normal pb-2 pr-4 text-right">WAPE</th>
                  <th className="font-normal pb-2 text-right">Bias</th>
                </tr>
              </thead>
              <tbody>
                {backtest.map((r) => (
                  <tr key={r.model} className="border-t border-gray-50">
                    <td className="py-2 pr-4 text-gray-800">{r.model}</td>
                    <td className="py-2 pr-4 text-right text-gray-700">{r.mae.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-right text-gray-700">{r.rmse.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-right font-medium text-indigo-600">{(r.wape * 100).toFixed(1)}%</td>
                    <td className={`py-2 text-right ${r.bias < 0 ? "text-red-500" : "text-green-600"}`}>{(r.bias * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5 pt-4 border-t border-gray-100">
              {Object.entries(METRIC_INFO).map(([k, v]) => (
                <div key={k} className="text-[12px]">
                  <span className="font-medium text-gray-700">{k}:</span>{" "}
                  <span className="text-gray-500">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
