import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import api from "../api";

export default function StockoutRiskPage() {
  const [rows, setRows] = useState([]);
  const [stores, setStores] = useState([]);
  const [level, setLevel] = useState("");
  const [storeId, setStoreId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState("days_of_stock_remaining");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => { api.stores().then(setStores).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 2000 };
    if (level) params.level = level;
    if (storeId) params.store_id = storeId;
    api.stockoutRisk(params).then(setRows).finally(() => setLoading(false));
  }, [level, storeId]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const sorted = [...rows].sort((a, b) => {
    const va = a[sortKey], vb = b[sortKey];
    const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const levelColor = { HIGH: "text-red-600 bg-red-50", MEDIUM: "text-amber-600 bg-amber-50", LOW: "text-green-600 bg-green-50" };

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900">Stockout Risk</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{rows.length.toLocaleString()} store x SKU pairs {level && `- ${level}`}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={level} onChange={(e) => setLevel(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-600">
            <option value="">All risk levels</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-600">
            <option value="">All stores</option>
            {stores.map((s) => <option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
            <Loader2 className="animate-spin" size={18} /> Loading...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-100">
                  <th className="font-normal pb-2 pr-4">SKU</th>
                  <th className="font-normal pb-2 pr-4">Store</th>
                  <th className="font-normal pb-2 pr-4 text-right cursor-pointer hover:text-gray-600" onClick={() => toggleSort("current_stock")}>Stock</th>
                  <th className="font-normal pb-2 pr-4 text-right cursor-pointer hover:text-gray-600" onClick={() => toggleSort("avg_daily_forecast")}>Daily demand</th>
                  <th className="font-normal pb-2 pr-4 text-right cursor-pointer hover:text-gray-600" onClick={() => toggleSort("days_of_stock_remaining")}>Days left</th>
                  <th className="font-normal pb-2 text-right">Risk</th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, 300).map((r) => (
                  <tr key={`${r.store_id}-${r.sku_id}`} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-4 text-gray-800">{r.product_name}</td>
                    <td className="py-2 pr-4 text-gray-500">{r.store_name}</td>
                    <td className="py-2 pr-4 text-right text-gray-700">{r.current_stock}</td>
                    <td className="py-2 pr-4 text-right text-gray-700">{r.avg_daily_forecast.toFixed(1)}</td>
                    <td className="py-2 pr-4 text-right font-medium text-gray-800">{r.days_of_stock_remaining.toFixed(1)}</td>
                    <td className="py-2 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${levelColor[r.stockout_risk_level] || ""}`}>
                        {r.stockout_risk_level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sorted.length > 300 && (
              <div className="text-center text-[12px] text-gray-400 pt-3">
                Showing first 300 of {sorted.length.toLocaleString()} — narrow with the filters above to see more specific results
              </div>
            )}
            {sorted.length === 0 && <div className="text-center text-gray-400 py-8">No pairs match this filter</div>}
          </div>
        )}
      </div>
    </div>
  );
}
