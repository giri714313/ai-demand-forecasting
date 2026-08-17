import React, { useState, useEffect } from "react";
import { Loader2, FileText, Printer } from "lucide-react";
import api from "../api";

export default function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [backtest, setBacktest] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.dashboardSummary(), api.backtestResults()])
      .then(([s, b]) => { setSummary(s); setBacktest(b); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
        <Loader2 className="animate-spin" size={18} /> Loading...
      </div>
    );
  }

  const accuracyPct = backtest.length ? ((1 - backtest[0].wape) * 100).toFixed(1) : "-";
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900">Reports</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Summary snapshot, printable or saveable as PDF</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-indigo-500 text-white rounded-lg px-4 py-2 text-[13px] font-medium hover:bg-indigo-600"
        >
          <Printer size={14} /> Print / Save as PDF
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-2xl">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={18} className="text-indigo-500" />
          <div className="text-[18px] font-medium text-gray-900">Demand Forecasting Summary Report</div>
        </div>
        <div className="text-[12px] text-gray-400 mb-6">Generated {today}</div>

        <div className="grid grid-cols-2 gap-y-3 text-[13px] mb-6">
          <div className="text-gray-500">Active stores</div>
          <div className="text-gray-900 font-medium text-right">{summary.total_stores}</div>
          <div className="text-gray-500">Active SKUs</div>
          <div className="text-gray-900 font-medium text-right">{summary.total_skus}</div>
          <div className="text-gray-500">Store x SKU pairs forecasted</div>
          <div className="text-gray-900 font-medium text-right">{summary.total_store_sku_pairs.toLocaleString()}</div>
          <div className="text-gray-500">Best model</div>
          <div className="text-gray-900 font-medium text-right">{summary.best_model}</div>
          <div className="text-gray-500">Forecast accuracy (1 minus WAPE)</div>
          <div className="text-gray-900 font-medium text-right">{accuracyPct}%</div>
        </div>

        <div className="text-[13px] font-medium text-gray-800 mb-2">Risk breakdown</div>
        <div className="grid grid-cols-2 gap-y-2 text-[13px] mb-6">
          <div className="text-gray-500">High stockout risk</div>
          <div className="text-red-600 font-medium text-right">{summary.high_risk_count} pairs</div>
          <div className="text-gray-500">Medium stockout risk</div>
          <div className="text-amber-600 font-medium text-right">{summary.medium_risk_count} pairs</div>
          <div className="text-gray-500">Overstocked</div>
          <div className="text-blue-600 font-medium text-right">{summary.overstock_count} pairs</div>
          <div className="text-gray-500">Replenishment recommendations</div>
          <div className="text-purple-600 font-medium text-right">{summary.total_replenishment_recs}</div>
          <div className="text-gray-500">Transfer recommendations</div>
          <div className="text-green-600 font-medium text-right">{summary.total_transfer_recs}</div>
        </div>

        <div className="text-[13px] font-medium text-gray-800 mb-2">Model comparison</div>
        <table className="w-full text-[12.5px] mb-2">
          <thead>
            <tr className="text-gray-400 text-left border-b border-gray-100">
              <th className="font-normal pb-2 pr-4">Model</th>
              <th className="font-normal pb-2 pr-4 text-right">WAPE</th>
              <th className="font-normal pb-2 text-right">Bias</th>
            </tr>
          </thead>
          <tbody>
            {backtest.map((r) => (
              <tr key={r.model} className="border-t border-gray-50">
                <td className="py-1.5 pr-4 text-gray-700">{r.model}</td>
                <td className="py-1.5 pr-4 text-right text-gray-700">{(r.wape * 100).toFixed(1)}%</td>
                <td className="py-1.5 text-right text-gray-700">{(r.bias * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-[11px] text-gray-400 mt-6 pt-4 border-t border-gray-100">
          Based on synthetic pilot data. Not a representation of any real retailer's actual performance.
        </div>
      </div>
    </div>
  );
}
