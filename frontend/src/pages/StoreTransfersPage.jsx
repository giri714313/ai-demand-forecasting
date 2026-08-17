import React, { useState, useEffect } from "react";
import { Loader2, ArrowLeftRight } from "lucide-react";
import api from "../api";

export default function StoreTransfersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.transferRecs({ limit: 2000 }).then(setRows).finally(() => setLoading(false));
  }, []);

  const totalUnits = rows.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900">Store Transfers</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {rows.length.toLocaleString()} suggested transfers · {totalUnits.toFixed(0)} units
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
            <Loader2 className="animate-spin" size={18} /> Loading...
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ArrowLeftRight className="text-gray-300 mb-2" size={28} />
            <div className="text-gray-500 text-sm">No transfer recommendations currently</div>
            <div className="text-gray-400 text-xs mt-1 max-w-sm">
              Transfers are matched between a HIGH stockout-risk store and a store with overstock
              of the same SKU. Since the synthetic data has no overstock anywhere, there's nothing
              to match against yet — this logic is real and will populate as soon as either real
              data or a more varied demo dataset is loaded.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-100">
                  <th className="font-normal pb-2 pr-4">SKU</th>
                  <th className="font-normal pb-2 pr-4">From store</th>
                  <th className="font-normal pb-2 pr-4">To store</th>
                  <th className="font-normal pb-2 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 300).map((r, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-4 text-gray-800">{r.product_name}</td>
                    <td className="py-2 pr-4 text-gray-500">{r.from_store_name}</td>
                    <td className="py-2 pr-4 text-gray-500">{r.store_name}</td>
                    <td className="py-2 text-right font-medium text-green-600 flex items-center justify-end gap-1.5">
                      <ArrowLeftRight size={12} /> {r.quantity.toFixed(0)} units
                    </td>
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
