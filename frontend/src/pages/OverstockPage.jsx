import React, { useState, useEffect } from "react";
import { Loader2, PackageX } from "lucide-react";
import api from "../api";

export default function OverstockPage() {
  const [rows, setRows] = useState([]);
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.stores().then(setStores).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 2000 };
    if (storeId) params.store_id = storeId;
    api.overstockRisk(params).then(setRows).finally(() => setLoading(false));
  }, [storeId]);

  const totalExcess = rows.reduce((sum, r) => sum + r.excess_units, 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900">Overstock</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {rows.length.toLocaleString()} overstocked pairs · {totalExcess.toFixed(0)} excess units
          </p>
        </div>
        <select value={storeId} onChange={(e) => setStoreId(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-600">
          <option value="">All stores</option>
          {stores.map((s) => <option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
            <Loader2 className="animate-spin" size={18} /> Loading...
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <PackageX className="text-gray-300 mb-2" size={28} />
            <div className="text-gray-500 text-sm">No overstocked pairs currently</div>
            <div className="text-gray-400 text-xs mt-1 max-w-sm">
              This is a property of the current synthetic pilot data, not a real result — the demo
              inventory levels weren't tuned to create overstock scenarios. Expect this to populate
              once real retailer data is loaded.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-100">
                  <th className="font-normal pb-2 pr-4">SKU</th>
                  <th className="font-normal pb-2 pr-4">Store</th>
                  <th className="font-normal pb-2 pr-4 text-right">Current stock</th>
                  <th className="font-normal pb-2 pr-4 text-right">Daily demand</th>
                  <th className="font-normal pb-2 text-right">Excess units</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 300).map((r) => (
                  <tr key={`${r.store_id}-${r.sku_id}`} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-4 text-gray-800">{r.product_name}</td>
                    <td className="py-2 pr-4 text-gray-500">{r.store_name}</td>
                    <td className="py-2 pr-4 text-right text-gray-700">{r.current_stock}</td>
                    <td className="py-2 pr-4 text-right text-gray-700">{r.avg_daily_forecast.toFixed(1)}</td>
                    <td className="py-2 text-right font-medium text-amber-600">{r.excess_units.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
