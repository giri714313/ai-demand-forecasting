import React, { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  LayoutGrid, TrendingUp, AlertTriangle, PackageX, RefreshCw, ArrowLeftRight,
  LineChart as LineChartIcon, FileText, Bell, Database, Settings, ChevronDown,
  ArrowRight, Boxes, Layers, ChevronsLeft, ChevronsRight, Loader2, ServerCrash,
} from "lucide-react";
import api, { getToken, setToken } from "./api";
import LoginPage from "./pages/LoginPage";
import StockoutRiskPage from "./pages/StockoutRiskPage";
import ReplenishmentPage from "./pages/ReplenishmentPage";
import DemandForecastPage from "./pages/DemandForecastPage";
import OverstockPage from "./pages/OverstockPage";
import StoreTransfersPage from "./pages/StoreTransfersPage";
import ForecastAccuracyPage from "./pages/ForecastAccuracyPage";
import AlertsPage from "./pages/AlertsPage";
import DataManagementPage from "./pages/DataManagementPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";

const navItems = [
  { label: "Overview", icon: LayoutGrid, active: true },
  { label: "Demand Forecast", icon: TrendingUp },
  { label: "Stockout Risk", icon: AlertTriangle },
  { label: "Overstock", icon: PackageX },
  { label: "Replenishment", icon: RefreshCw },
  { label: "Store Transfers", icon: ArrowLeftRight },
  { label: "Forecast Accuracy", icon: LineChartIcon },
  { label: "Reports", icon: FileText },
  { label: "Alerts", icon: Bell },
  { label: "Data Management", icon: Database },
];

function KpiCard({ icon: Icon, iconBg, iconColor, label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: iconBg }}>
          <Icon size={18} color={iconColor} />
        </div>
        <div className="text-[13px] text-gray-500 leading-tight">{label}</div>
      </div>
      <div>
        <div className="text-2xl font-medium text-gray-900">{value}</div>
        <div className="text-xs text-gray-400 mt-1">{sub}</div>
      </div>
    </div>
  );
}

function ActionCard({ icon: Icon, iconBg, iconColor, label, value, sub, linkColor }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
        <Icon size={18} color={iconColor} />
      </div>
      <div className="text-[13px] font-medium" style={{ color: linkColor }}>{label}</div>
      <div className="text-xl font-medium text-gray-900">{value}</div>
      <div className="text-xs text-gray-400 mb-1">{sub}</div>
    </div>
  );
}

function SetupScreen({ status, onRun }) {
  return (
    <div className="w-full min-h-screen bg-[#F5F6FA] flex items-center justify-center p-6">
      <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full text-center">
        {status === "checking" && (
          <>
            <Loader2 className="animate-spin mx-auto mb-3 text-indigo-500" size={28} />
            <div className="text-gray-700 font-medium">Connecting to backend…</div>
          </>
        )}
        {status === "no-data" && (
          <>
            <Database className="mx-auto mb-3 text-amber-500" size={28} />
            <div className="text-gray-800 font-medium mb-1">Backend is up, but no data yet</div>
            <p className="text-gray-500 text-sm mb-4">
              Ingest the dataset and run the pipeline first: POST to <code>/ingest/*</code>,
              then <code>/pipeline/train</code>, then <code>/pipeline/generate-forecasts</code>.
              See the backend README.
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <ServerCrash className="mx-auto mb-3 text-red-500" size={28} />
            <div className="text-gray-800 font-medium mb-1">Can't reach the backend</div>
            <p className="text-gray-500 text-sm mb-4">
              Check that the API is running and that <code>VITE_API_URL</code> points to it.
              Current target: <code>{import.meta.env.VITE_API_URL || "http://localhost:8000"}</code>
            </p>
            <button onClick={onRun} className="text-sm bg-indigo-500 text-white px-4 py-2 rounded-lg">
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [collapsed, setCollapsed] = useState(false);

  const [authStatus, setAuthStatus] = useState("checking"); // checking | unauthed | authed
  const [user, setUser] = useState(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const [status, setStatus] = useState("checking"); // checking | ready | no-data | error
  const [summary, setSummary] = useState(null);
  const [backtest, setBacktest] = useState([]);
  const [highRisk, setHighRisk] = useState([]);
  const [mediumCount, setMediumCount] = useState(0);
  const [overstock, setOverstock] = useState([]);

  async function checkAuth() {
    const token = getToken();
    if (!token) {
      setAuthStatus("unauthed");
      return;
    }
    try {
      const u = await api.me();
      setUser(u);
      setAuthStatus("authed");
    } catch {
      setToken(null);
      setAuthStatus("unauthed");
    }
  }

  useEffect(() => { checkAuth(); }, []);

  function handleAuthed(u) {
    setUser(u);
    setAuthStatus("authed");
  }

  function handleLogout() {
    setToken(null);
    setUser(null);
    setAuthStatus("unauthed");
    setAccountMenuOpen(false);
  }

  async function loadAll() {
    setStatus("checking");
    try {
      await api.health();
      const s = await api.dashboardSummary();
      if (!s.total_stores) {
        setStatus("no-data");
        return;
      }
      const [bt, risk, over] = await Promise.all([
        api.backtestResults(),
        api.stockoutRisk({ level: "HIGH", limit: 5 }),
        api.overstockRisk({ limit: 5 }),
      ]);
      setSummary(s);
      setBacktest(bt);
      setHighRisk(risk);
      setOverstock(over);
      setStatus("ready");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }

  useEffect(() => { if (authStatus === "authed") loadAll(); }, [authStatus]);

  if (authStatus === "checking") {
    return (
      <div className="w-full min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-400" size={24} />
      </div>
    );
  }

  if (authStatus === "unauthed") {
    return <LoginPage onAuthed={handleAuthed} />;
  }

  if (status !== "ready") {
    return <SetupScreen status={status} onRun={loadAll} />;
  }

  const accuracyPct = backtest.length ? ((1 - backtest[0].wape) * 100).toFixed(1) : "—";
  const forecastSummary = [
    { name: "High stockout risk", value: summary.high_risk_count, color: "#dc2626" },
    { name: "Medium stockout risk", value: summary.medium_risk_count, color: "#f59e0b" },
    { name: "Overstocked", value: summary.overstock_count, color: "#2563eb" },
    { name: "Healthy", value: Math.max(summary.total_store_sku_pairs - summary.high_risk_count - summary.medium_risk_count - summary.overstock_count, 0), color: "#16a34a" },
  ];

  return (
    <div className="w-full min-h-screen bg-[#F5F6FA] flex text-gray-900" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <aside
        className="bg-[#161335] flex flex-col shrink-0 transition-[width] duration-200 ease-in-out relative"
        style={{ width: collapsed ? 72 : 240 }}
      >
        <div className={`py-5 flex items-center gap-2.5 border-b border-white/10 ${collapsed ? "justify-center px-0" : "px-5"}`}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0">
            <Boxes size={17} color="white" />
          </div>
          {!collapsed && <div className="text-white text-[14px] font-medium leading-tight whitespace-nowrap">AI Demand<br />Forecasting</div>}
        </div>

        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-[#161335] border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-indigo-500 transition-colors z-10"
        >
          {collapsed ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
        </button>

        <div className={`pt-4 pb-2 ${collapsed ? "px-2" : "px-4"}`}>
          <button className={`w-full bg-white/5 hover:bg-white/10 text-white text-[13px] rounded-lg py-2.5 flex items-center border border-white/10 ${collapsed ? "justify-center px-0" : "justify-between px-3"}`} title="Select retailer">
            {collapsed ? <span className="text-[11px] font-medium">DR</span> : (<>Demo Retailer <ChevronDown size={14} className="text-white/50" /></>)}
          </button>
        </div>

        <nav className={`flex-1 py-2 flex flex-col gap-0.5 ${collapsed ? "px-2" : "px-3"}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.label;
            return (
              <button key={item.label} onClick={() => setActiveNav(item.label)} title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 py-2.5 rounded-lg text-[13.5px] transition-colors whitespace-nowrap overflow-hidden ${collapsed ? "justify-center px-0" : "px-3"} ${isActive ? "bg-indigo-500 text-white" : "text-indigo-100/70 hover:bg-white/5 hover:text-white"}`}>
                <Icon size={16} className="shrink-0" />
                {!collapsed && item.label}
              </button>
            );
          })}
          <div className="h-px bg-white/10 my-2" />
          <button onClick={() => setActiveNav("Settings")} title={collapsed ? "Settings" : undefined}
            className={`flex items-center gap-3 py-2.5 rounded-lg text-[13.5px] whitespace-nowrap overflow-hidden ${collapsed ? "justify-center px-0" : "px-3"} ${activeNav === "Settings" ? "bg-indigo-500 text-white" : "text-indigo-100/70 hover:bg-white/5 hover:text-white"}`}>
            <Settings size={16} className="shrink-0" />
            {!collapsed && "Settings"}
          </button>
        </nav>

        <div className={`py-4 border-t border-white/10 relative ${collapsed ? "px-2" : "px-4"}`}>
          <button
            onClick={() => setAccountMenuOpen((o) => !o)}
            className={`w-full flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}
          >
            <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center text-white text-xs font-medium shrink-0">
              {user?.full_name?.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?"}
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 text-left">
                  <div className="text-white text-[13px] font-medium truncate">{user?.full_name}</div>
                  <div className="text-indigo-200/50 text-[11px] truncate capitalize">{user?.role}</div>
                </div>
                <ChevronDown size={14} className="text-white/40 ml-auto shrink-0" />
              </>
            )}
          </button>

          {accountMenuOpen && (
            <div className={`absolute bottom-full mb-2 bg-[#1E1B3A] border border-white/10 rounded-lg shadow-xl overflow-hidden ${collapsed ? "left-2 w-40" : "left-4 right-4"}`}>
              <div className="px-3 py-2 text-[12px] text-white/50 border-b border-white/10 truncate">{user?.email}</div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-[13px] text-white hover:bg-white/10"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-x-auto min-w-0">
        {activeNav === "Overview" && (
        <>
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-[22px] font-medium text-gray-900">Overview</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">Live from the forecasting API · pilot dataset</p>
          </div>
          <button onClick={loadAll} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-600 flex items-center gap-2 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
          <KpiCard icon={Boxes} iconBg="#EAF1FE" iconColor="#2563eb" label="Total Stores" value={summary.total_stores} sub="Active stores (pilot)" />
          <KpiCard icon={Layers} iconBg="#E9F9F1" iconColor="#16a34a" label="Total SKUs" value={summary.total_skus} sub="Active SKUs (pilot)" />
          <KpiCard icon={Database} iconBg="#F1EEFE" iconColor="#7c3aed" label="Store x SKU pairs" value={summary.total_store_sku_pairs.toLocaleString()} sub="Forecasted series" />
          <KpiCard icon={TrendingUp} iconBg="#FEF3E8" iconColor="#ea580c" label="Forecast Accuracy" value={`${accuracyPct}%`} sub={`1 - WAPE (${summary.best_model || "—"})`} />
          <KpiCard icon={AlertTriangle} iconBg="#FDECEC" iconColor="#dc2626" label="High Stockout Risk" value={summary.high_risk_count} sub={`of ${summary.total_store_sku_pairs.toLocaleString()} pairs`} />
          <KpiCard icon={PackageX} iconBg="#EAF1FE" iconColor="#2563eb" label="Overstocked" value={summary.overstock_count} sub="SKU-store pairs" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr_1fr] gap-4 mb-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-[14px] font-medium text-gray-800 mb-3">Model comparison (backtest)</div>
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-gray-400 text-left">
                  <th className="font-normal pb-2">Model</th>
                  <th className="font-normal pb-2 text-right">MAE</th>
                  <th className="font-normal pb-2 text-right">RMSE</th>
                  <th className="font-normal pb-2 text-right">WAPE</th>
                  <th className="font-normal pb-2 text-right">Bias</th>
                </tr>
              </thead>
              <tbody>
                {backtest.map((r) => (
                  <tr key={r.model} className="border-t border-gray-100">
                    <td className="py-2 text-gray-800">{r.model}</td>
                    <td className="py-2 text-right text-gray-700">{r.mae.toFixed(2)}</td>
                    <td className="py-2 text-right text-gray-700">{r.rmse.toFixed(2)}</td>
                    <td className="py-2 text-right font-medium text-indigo-600">{(r.wape * 100).toFixed(1)}%</td>
                    <td className={`py-2 text-right ${r.bias < 0 ? "text-red-500" : "text-green-600"}`}>{(r.bias * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-[14px] font-medium text-gray-800 mb-3">Risk breakdown</div>
            <div className="relative flex items-center justify-center" style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={forecastSummary} dataKey="value" innerRadius={45} outerRadius={65} paddingAngle={2} stroke="none">
                    {forecastSummary.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center">
                <div className="text-lg font-medium text-gray-900">{summary.total_store_sku_pairs.toLocaleString()}</div>
                <div className="text-[11px] text-gray-400">pairs</div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 mt-3">
              {forecastSummary.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />
                    {s.name}
                  </span>
                  <span className="text-gray-700">{s.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-red-50 rounded-xl border border-red-100 p-4 flex-1">
              <div className="text-[13px] font-medium text-red-700 mb-1">High stockout risk</div>
              <div className="text-2xl font-medium text-gray-900">{summary.high_risk_count} <span className="text-sm font-normal text-gray-500">pairs</span></div>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 flex-1">
              <div className="text-[13px] font-medium text-amber-700 mb-1">Medium stockout risk</div>
              <div className="text-2xl font-medium text-gray-900">{summary.medium_risk_count} <span className="text-sm font-normal text-gray-500">pairs</span></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-[14px] font-medium text-gray-800 mb-3">Top stockout risks (live)</div>
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-gray-400 text-left">
                  <th className="font-normal pb-2">SKU</th>
                  <th className="font-normal pb-2">Store</th>
                  <th className="font-normal pb-2 text-right">Stock</th>
                  <th className="font-normal pb-2 text-right">Days left</th>
                </tr>
              </thead>
              <tbody>
                {highRisk.map((r) => (
                  <tr key={`${r.store_id}-${r.sku_id}`} className="border-t border-gray-100">
                    <td className="py-2 text-gray-800">{r.product_name}</td>
                    <td className="py-2 text-gray-500">{r.store_name}</td>
                    <td className="py-2 text-right text-gray-700">{r.current_stock}</td>
                    <td className="py-2 text-right text-red-600 font-medium">{r.days_of_stock_remaining.toFixed(1)}</td>
                  </tr>
                ))}
                {highRisk.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-gray-400">No high-risk pairs</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-[14px] font-medium text-gray-800 mb-3">Top overstock risks (live)</div>
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-gray-400 text-left">
                  <th className="font-normal pb-2">SKU</th>
                  <th className="font-normal pb-2">Store</th>
                  <th className="font-normal pb-2 text-right">Excess units</th>
                </tr>
              </thead>
              <tbody>
                {overstock.map((r) => (
                  <tr key={`${r.store_id}-${r.sku_id}`} className="border-t border-gray-100">
                    <td className="py-2 text-gray-800">{r.product_name}</td>
                    <td className="py-2 text-gray-500">{r.store_name}</td>
                    <td className="py-2 text-right text-amber-600 font-medium">{r.excess_units.toFixed(0)}</td>
                  </tr>
                ))}
                {overstock.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-gray-400">None currently — data artifact of the synthetic set</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <ActionCard icon={RefreshCw} iconBg="#F1EEFE" iconColor="#7c3aed" label="Replenishment" value={summary.total_replenishment_recs} sub="Live recommendations" linkColor="#7c3aed" />
          <ActionCard icon={ArrowLeftRight} iconBg="#E9F9F1" iconColor="#16a34a" label="Store transfers" value={summary.total_transfer_recs} sub="Live recommendations" linkColor="#16a34a" />
          <ActionCard icon={TrendingUp} iconBg="#EAF1FE" iconColor="#2563eb" label="Best model" value={summary.best_model || "—"} sub={`WAPE ${(summary.best_model_wape * 100).toFixed(1)}%`} linkColor="#2563eb" />
        </div>

        <div className="text-[11px] text-gray-400 text-right pb-2">
          Connected to {import.meta.env.VITE_API_URL || "http://localhost:8000"} · synthetic pilot data
        </div>
        </>
        )}

        {activeNav === "Stockout Risk" && <StockoutRiskPage />}
        {activeNav === "Replenishment" && <ReplenishmentPage />}
        {activeNav === "Demand Forecast" && <DemandForecastPage />}
        {activeNav === "Overstock" && <OverstockPage />}
        {activeNav === "Store Transfers" && <StoreTransfersPage />}
        {activeNav === "Forecast Accuracy" && <ForecastAccuracyPage />}
        {activeNav === "Alerts" && <AlertsPage />}
        {activeNav === "Data Management" && <DataManagementPage isAdmin={user?.role === "admin"} />}
        {activeNav === "Reports" && <ReportsPage />}
        {activeNav === "Settings" && <SettingsPage isAdmin={user?.role === "admin"} />}
      </main>
    </div>
  );
}
