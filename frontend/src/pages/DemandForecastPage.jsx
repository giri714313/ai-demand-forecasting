import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2, TrendingUp } from "lucide-react";
import api from "../api";

export default function DemandForecastPage() {
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [storeId, setStoreId] = useState("");
  const [skuId, setSkuId] = useState("");
  const [horizon, setHorizon] = useState(30);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.stores().then((s) => { setStores(s); if (s[0]) setStoreId(s[0].store_id); }).catch(() => {});
    api.products().then((p) => { setProducts(p); if (p[0]) setSkuId(p[0].sku_id); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!storeId || !skuId) return;
    setLoading(true);
    // Always fetch the full 90-day series once per store/SKU change, then
    // slice to the selected horizon client-side -- the backend's /forecasts
    // doesn't currently truncate by date range for a single series (it
    // returns everything up to 90 days regardless of `days`), so re-fetching
    // per horizon click would be wasted round trips for no different data.
    api.forecasts({ store_id: storeId, sku_id: skuId, days: 90 })
      .then(setForecast)
      .finally(() => setLoading(false));
  }, [storeId, skuId]);

  const visibleForecast = forecast.slice(0, horizon);
  const chartData = visibleForecast.map((f) => ({
    date: new Date(f.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    units: f.forecast_units,
  }));

  const totalUnits = visibleForecast.reduce((sum, f) => sum + f.forecast_units, 0);
  const avgDaily = visibleForecast.length ? totalUnits / visibleForecast.length : 0;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900">Demand Forecast</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Store x SKU forward forecast, recursive multi-step model</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[12px] text-gray-500 block mb-1">Store</label>
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 min-w-[200px]">
              {stores.map((s) => <option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[12px] text-gray-500 block mb-1">SKU</label>
            <select value={skuId} onChange={(e) => setSkuId(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-700 min-w-[240px]">
              {products.map((p) => <option key={p.sku_id} value={p.sku_id}>{p.product_name}</option>)}
            </select>
          </div>
          <div className="flex gap-1.5 ml-auto">
            {[7, 30, 90].map((h) => (
              <button key={h} onClick={() => setHorizon(h)}
                className={`px-3 py-2 rounded-lg text-[13px] font-medium ${horizon === h ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {h}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-[14px] font-medium text-gray-800 mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-500" /> Forecasted demand
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Loader2 className="animate-spin" size={18} /> Loading forecast...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F5" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false}
                  interval={horizon > 30 ? Math.floor(horizon / 12) : 0} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }} />
                <Line type="monotone" dataKey="units" stroke="#4F46E5" strokeWidth={2} dot={horizon <= 30} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex flex-col gap-3 w-full md:w-48">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-[12px] text-gray-500 mb-1">Total forecast ({horizon}d)</div>
            <div className="text-xl font-medium text-gray-900">{totalUnits.toFixed(0)} units</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-[12px] text-gray-500 mb-1">Avg daily demand</div>
            <div className="text-xl font-medium text-gray-900">{avgDaily.toFixed(1)} units</div>
          </div>
        </div>
      </div>
    </div>
  );
}
