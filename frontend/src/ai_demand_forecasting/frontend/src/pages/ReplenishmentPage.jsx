import React, { useState, useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import api from "../api";

export default function ReplenishmentPage() {
  const [rows, setRows] = useState([]);
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.stores().then(setStores).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 2000 };
    if (storeId) params.store_id = storeId;
    api.replenishmentRecs(params).then(setRows).finally(() => setLoading(false));
  }, [storeId]);

  const totalUnits = rows.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900">Replenishment</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {rows.length.toLocaleString()} recommendations · {totalUnits.toLocaleString()} total units
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-100">
                  <th className="font-normal pb-2 pr-4">SKU</th>
                  <th className="font-normal pb-2 pr-4">Store</th>
                  <th className="font-normal pb-2 text-right">Order quantity</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 300).sort((a, b) => b.quantity - a.quantity).map((r) => (
                  <tr key={`${r.store_id}-${r.sku_id}`} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-4 text-gray-800">{r.product_name}</td>
                    <td className="py-2 pr-4 text-gray-500">{r.store_name}</td>
                    <td className="py-2 text-right font-medium text-purple-600 flex items-center justify-end gap-1.5">
                      <RefreshCw size={12} /> {r.quantity.toFixed(0)} units
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 300 && (
              <div className="text-center text-[12px] text-gray-400 pt-3">
                Showing first 300 of {rows.length.toLocaleString()} — filter by store above to narrow down
              </div>
            )}
            {rows.length === 0 && <div className="text-center text-gray-400 py-8">No recommendations for this store</div>}
          </div>
        )}
      </div>
    </div>
  );
}
