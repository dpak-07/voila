import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Layers,
  BarChart3,
  Bot,
  LogOut,
  UploadCloud,
  ArrowRight,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import { api, getUsername, logout } from "../api";

const fmt = (n) =>
  n == null || Number.isNaN(Number(n)) ? "--" : Number(n).toLocaleString();

export default function Insights() {
  const navigate = useNavigate();
  const userName = getUsername() || "Analyst";
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const [kpis, setKpis] = useState(null);
  const [runs, setRuns] = useState([]);
  const [compare, setCompare] = useState(null);
  const [compareError, setCompareError] = useState("");
  const [curRun, setCurRun] = useState("");
  const [prevRun, setPrevRun] = useState("");
  const [loading, setLoading] = useState(true);
  const [compareLoading, setCompareLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [k, r] = await Promise.all([api.kpis({}), api.runs()]);
      setKpis(k);
      setRuns(r.runs || []);
      if (r.runs && r.runs.length > 0) {
        setCurRun(r.runs[0].run_id);
        if (r.runs.length > 1) {
          setPrevRun(r.runs[1].run_id);
          runCompare(r.runs[0].run_id, r.runs[1].run_id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const runCompare = async (currentRun, previousRun) => {
    if (!currentRun || !previousRun) return;
    setCompareLoading(true);
    setCompareError("");
    try {
      const res = await api.compare(currentRun, previousRun);
      setCompare(res);
    } catch (e) {
      setCompareError(e.message || "Comparison failed");
    } finally {
      setCompareLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const summary = compare?.comparison_summary || {};

  const chartData = Object.entries(summary).map(([key, val]) => ({
    metric: key.replace(/_/g, " "),
    Current: Number(val?.current || 0),
    Previous: Number(val?.previous || 0),
  }));

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col shrink-0 sticky top-0 h-screen z-30 select-none">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              VOILA <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold">AI</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">Dataset Comparison</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
          >
            <BarChart3 size={17} />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => navigate("/data-extract")}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
          >
            <UploadCloud size={17} />
            <span>Dataset Ingestion</span>
          </button>
          <button
            onClick={() => navigate("/insights")}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition-all"
          >
            <Layers size={17} />
            <span>Run Comparison</span>
          </button>
          <button
            onClick={() => navigate("/voila")}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
          >
            <Bot size={17} />
            <span>AI Full Workspace</span>
          </button>
        </nav>

        <div className="p-3 border-t border-slate-800/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-500/20"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        <header className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-8 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Run-to-Run Dataset Comparison</h1>
            <p className="text-xs text-slate-400">Zero-RAM delta trajectory comparison across consecutive dataset runs.</p>
          </div>
          <button
            onClick={load}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-indigo-400" : ""} />
          </button>
        </header>

        <main className="flex-1 p-8 space-y-6 overflow-y-auto">
          {/* Run Selectors */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-extrabold uppercase text-white tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-indigo-400" />
              Select Runs for Comparison
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1.5">Current Dataset Run</label>
                <select
                  value={curRun}
                  onChange={(e) => {
                    setCurRun(e.target.value);
                    runCompare(e.target.value, prevRun);
                  }}
                  className="w-full bg-slate-800 text-slate-200 border border-slate-700 text-xs rounded-lg px-3 py-2 font-semibold focus:outline-none focus:border-indigo-500"
                >
                  {runs.map((r) => (
                    <option key={r.run_id} value={r.run_id}>
                      Run #{String(r.run_id).slice(0, 8)} ({fmt(r.total_records)} rows)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1.5">Previous Baseline Run</label>
                <select
                  value={prevRun}
                  onChange={(e) => {
                    setPrevRun(e.target.value);
                    runCompare(curRun, e.target.value);
                  }}
                  className="w-full bg-slate-800 text-slate-200 border border-slate-700 text-xs rounded-lg px-3 py-2 font-semibold focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Select Baseline Run --</option>
                  {runs.map((r) => (
                    <option key={r.run_id} value={r.run_id}>
                      Run #{String(r.run_id).slice(0, 8)} ({fmt(r.total_records)} rows)
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => runCompare(curRun, prevRun)}
                disabled={!curRun || !prevRun || compareLoading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {compareLoading ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                <span>Compute Delta</span>
              </button>
            </div>
          </div>

          {/* Delta Comparison Cards */}
          {Object.keys(summary).length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(summary).map(([k, v]) => {
                  if (typeof v !== "object" || v == null) return null;
                  const improved = v.trend === "improved";
                  return (
                    <div
                      key={k}
                      className={`rounded-2xl border p-5 space-y-2 ${
                        improved ? "bg-emerald-950/20 border-emerald-500/30" : "bg-rose-950/20 border-rose-500/30"
                      }`}
                    >
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        {k.replace(/_/g, " ")}
                      </span>
                      <div className="text-2xl font-black text-white">
                        {v.current} {v.is_percentage ? "%" : "m"}
                        <span className="text-xs font-semibold text-slate-400 ml-1.5">(was {v.previous})</span>
                      </div>
                      <div className={`text-xs font-bold flex items-center gap-1 ${improved ? "text-emerald-400" : "text-rose-400"}`}>
                        {improved ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span>Delta: {v.delta > 0 ? "+" : ""}{v.delta} ({v.percentage_change}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Visual Recharts Bar Comparison */}
              {chartData.length > 0 && (
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    Visual Delta Comparison
                  </h3>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="metric" stroke="#64748b" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }} />
                        <Legend />
                        <Bar dataKey="Current" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Previous" fill="#64748b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center text-xs text-slate-400 space-y-2">
              <Layers size={32} className="mx-auto text-indigo-400/60 mb-2" />
              <p className="font-bold text-white text-sm">Delta Comparison Requires at Least 2 Ingested Runs</p>
              <p>Upload a new dataset to automatically measure performance improvements and SLA changes.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
