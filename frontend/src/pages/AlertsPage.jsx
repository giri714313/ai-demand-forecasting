import React, { useState, useEffect } from "react";
import { Loader2, AlertTriangle, Bell } from "lucide-react";
import api from "../api";

export default function AlertsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.stockoutRisk({ level: "HIGH", limit: 2000 }).then(setRows).finally(() => setLoading(false));
  }, []);

  const critical = rows.filter((r) => r.days_of_stock_remaining < 2);
  const urgent = rows.filter((r) => r.days_of_stock_remaining >= 2);

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900">Alerts</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {rows.length.toLocaleString()} active alerts, HIGH stockout-risk pairs sorted by urgency
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 className="animate-spin" size={18} /> Loading...
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 text-center">
          <Bell className="text-gray-300 mb-2" size={28} />
          <div className="text-gray-500 text-sm">No active alerts</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {critical.length > 0 && (
            <div className="text-[12px] font-medium text-red-600 uppercase tracking-wide mt-1 mb-1">
              Critical, under 2 days of stock ({critical.length})
            </div>
          )}
          {critical.slice(0, 100).map((r) => (
            <div key={`${r.store_id}-${r.sku_id}`} className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <AlertTriangle className="text-red-500 shrink-0" size={16} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-gray-800">
                  <span className="font-medium">{r.product_name}</span> at {r.store_name}
                </div>
                <div className="text-[12px] text-gray-500">
                  {r.current_stock} units in stock, {r.avg_daily_forecast.toFixed(1)}/day demand
                </div>
              </div>
              <div className="text-[13px] font-medium text-red-600 shrink-0">
                {r.days_of_stock_remaining.toFixed(1)}d left
              </div>
            </div>
          ))}

          {urgent.length > 0 && (
            <div className="text-[12px] font-medium text-amber-600 uppercase tracking-wide mt-4 mb-1">
              Urgent, high risk ({urgent.length})
            </div>
          )}
          {urgent.slice(0, 100).map((r) => (
            <div key={`${r.store_id}-${r.sku_id}`} className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <AlertTriangle className="text-amber-500 shrink-0" size={16} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-gray-800">
                  <span className="font-medium">{r.product_name}</span> at {r.store_name}
                </div>
                <div className="text-[12px] text-gray-500">
                  {r.current_stock} units in stock, {r.avg_daily_forecast.toFixed(1)}/day demand
                </div>
              </div>
              <div className="text-[13px] font-medium text-amber-600 shrink-0">
                {r.days_of_stock_remaining.toFixed(1)}d left
              </div>
            </div>
          ))}

          {rows.length > 200 && (
            <div className="text-center text-[12px] text-gray-400 pt-3">
              Showing first 200 of {rows.length.toLocaleString()} alerts
            </div>
          )}
        </div>
      )}
    </div>
  );
}
