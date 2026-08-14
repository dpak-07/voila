import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  UploadCloud,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Layers,
  Database,
  BarChart3,
  Bot,
  LogOut,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

import { api, getUsername, logout } from "../api";

const fmt = (n) =>
  n == null || Number.isNaN(Number(n)) ? "--" : Number(n).toLocaleString();

export default function DataExtract() {
  const navigate = useNavigate();
  const userName = getUsername() || "Analyst";
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [status, setStatus] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([api.status(), api.runs()]);
      setStatus(s.pipeline_logs || []);
      setRuns(r.runs || []);
    } catch (e) {
      setUploadError(e.message || "Failed to load pipeline status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const doUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadError("");
    setUploadResult(null);
    try {
      const res = await api.upload(file);
      setUploadResult(res);
      setTimeout(loadStatus, 1500);
    } catch (err) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const selectedFileLabel = file
    ? `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`
    : "Accepted formats: CSV, XLSX, JSON";

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
            <p className="text-[11px] text-slate-400 font-medium">Dataset Ingestion</p>
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
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition-all"
          >
            <UploadCloud size={17} />
            <span>Dataset Ingestion</span>
          </button>
          <button
            onClick={() => navigate("/insights")}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
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
            <h1 className="text-xl font-extrabold text-white tracking-tight">Dataset Ingestion &amp; Pipeline Engine</h1>
            <p className="text-xs text-slate-400">Upload customer support conversations for automated zero-RAM batch processing.</p>
          </div>
          <button
            onClick={loadStatus}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-indigo-400" : ""} />
          </button>
        </header>

        <main className="flex-1 p-8 space-y-6 overflow-y-auto">
          {/* Upload Card */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UploadCloud size={18} className="text-indigo-400" />
              Upload New Support Dataset
            </h2>

            <form onSubmit={doUpload} className="space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-950/40"
              >
                <UploadCloud size={32} className="text-indigo-400 mb-2" />
                <p className="text-xs font-bold text-white">{file ? file.name : "Click to select a dataset file"}</p>
                <p className="text-[11px] text-slate-400 mt-1">{selectedFileLabel}</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.json"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>

              {uploadError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadResult && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>
                    Successfully ingested <strong>{fmt(uploadResult.total_records || uploadResult.records_ingested)}</strong> records into Dataset Run #{String(uploadResult.dataset_run_id || "").slice(0, 8)}!
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={!file || uploading}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Processing Ingestion Pipeline...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={14} />
                    <span>Ingest &amp; Calculate Metrics</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Dataset Runs Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Database size={16} className="text-indigo-400" />
              Dataset Ingestion History ({runs.length} Runs)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px] font-bold">
                    <th className="py-2.5 px-3">Run ID</th>
                    <th className="py-2.5 px-3">Records</th>
                    <th className="py-2.5 px-3">File Name</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Ingested At</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {runs.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-indigo-300">#{String(r.run_id).slice(0, 8)}</td>
                      <td className="py-3 px-3 font-bold text-white">{fmt(r.total_records)}</td>
                      <td className="py-3 px-3 text-slate-300">{r.filename || "support_conversations.csv"}</td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                          READY
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{r.created_at ? new Date(r.created_at).toLocaleString() : "--"}</td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => navigate("/dashboard")}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-bold border border-slate-700"
                        >
                          View in Dashboard
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
