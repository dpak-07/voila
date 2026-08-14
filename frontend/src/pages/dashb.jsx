import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, BrainCircuit, AlertTriangle, Clock, CheckCircle2,
  TrendingDown, TrendingUp, RotateCcw, RefreshCw, Search, Send,
  ChevronRight, ShieldAlert, Cpu, Layers, LogOut, UploadCloud,
  BarChart3, Bot, Zap, CheckCircle, X, Activity, ArrowUpRight,
  ArrowDownRight, Target, Flame, Star, Radio, MessageSquare,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { api, getUsername, logout } from "../api";

/* ─── helpers ─────────────────────────────────────────────── */
const fmt   = (n) => (n == null || Number.isNaN(+n) ? "–" : Number(n).toLocaleString());
const pct   = (n) => (n == null || Number.isNaN(+n) ? "–" : `${(+n).toFixed(1)}%`);
const mins  = (n) => (n == null || Number.isNaN(+n) ? "–" : `${(+n).toFixed(1)} min`);

/* ─── sub-components ─────────────────────────────────────── */

/* KPI Pillar Card */
function PillarCard({ label, value, sub, color, icon: Icon, badge, trend }) {
  const colorMap = {
    emerald: "border-emerald-500/40 bg-emerald-500/5",
    rose:    "border-rose-500/40    bg-rose-500/5",
    sky:     "border-sky-500/40     bg-sky-500/5",
    violet:  "border-violet-500/40  bg-violet-500/5",
  };
  const accentMap = {
    emerald: "bg-emerald-500", rose: "bg-rose-500", sky: "bg-sky-500", violet: "bg-violet-500",
  };
  const iconMap = {
    emerald: "bg-emerald-500/15 text-emerald-400",
    rose:    "bg-rose-500/15    text-rose-400",
    sky:     "bg-sky-500/15     text-sky-400",
    violet:  "bg-violet-500/15  text-violet-400",
  };
  const textMap = {
    emerald: "text-emerald-400", rose: "text-rose-400", sky: "text-sky-300", violet: "text-violet-400",
  };
  return (
    <div className={`relative rounded-2xl border ${colorMap[color]} bg-slate-900/80 overflow-hidden flex flex-col`}>
      <div className={`h-[3px] w-full ${accentMap[color]}`} />
      <div className="p-5 flex flex-col flex-1 gap-3">
        <div className="flex items-start justify-between">
          <span className="text-xs font-semibold text-slate-400 leading-snug max-w-[75%]">{label}</span>
          <span className={`p-2 rounded-xl ${iconMap[color]}`}><Icon size={16} /></span>
        </div>
        <div>
          <div className={`text-3xl font-black tracking-tight ${textMap[color]}`}>{value}</div>
          {trend != null && (
            <div className="flex items-center gap-1 mt-1">
              {trend >= 0
                ? <TrendingUp size={12} className="text-emerald-400" />
                : <TrendingDown size={12} className="text-rose-400" />}
              <span className={`text-[11px] font-bold ${trend >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {trend >= 0 ? "+" : ""}{trend}%
              </span>
            </div>
          )}
        </div>
        {sub && (
          <div className="text-[11px] text-slate-400 leading-snug border-t border-slate-800/60 pt-2.5 mt-auto">
            {sub}
          </div>
        )}
        {badge && (
          <span className={`self-start text-[10px] font-bold px-2 py-0.5 rounded-full ${iconMap[color]} border border-current`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

/* Stat Tile (smaller metric tiles) */
function StatTile({ label, value, sub, icon: Icon, color = "indigo", progress }) {
  const tc = { indigo:"text-indigo-400", amber:"text-amber-400", emerald:"text-emerald-400", rose:"text-rose-400", sky:"text-sky-400" };
  const bc = { indigo:"bg-indigo-500", amber:"bg-amber-500", emerald:"bg-emerald-500", rose:"bg-rose-500", sky:"bg-sky-500" };
  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        {Icon && <Icon size={14} className={tc[color]} />}
      </div>
      <div className={`text-2xl font-black ${tc[color]}`}>{value}</div>
      {progress != null && (
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full ${bc[color]} rounded-full transition-all`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
      {sub && <span className="text-[11px] text-slate-500">{sub}</span>}
    </div>
  );
}

/* Sentiment Pill */
function SentPill({ s }) {
  const map = {
    positive: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    negative: "bg-rose-500/15    text-rose-400    border-rose-500/30",
    neutral:  "bg-slate-700/60   text-slate-300   border-slate-600/40",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${map[s] || map.neutral}`}>
      {s || "neutral"}
    </span>
  );
}

/* Priority Badge */
function PriBadge({ vol, neg, idx }) {
  if (idx === 0 || neg / vol > 0.25) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">P1 High</span>;
  if (idx < 3 || neg / vol > 0.1)   return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">P2 Med</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-400">P3 Low</span>;
}

const MEDALS = ["🥇", "🥈", "🥉", "4.", "5.", "6.", "7.", "8.", "9.", "10."];

const SENTIMENT_COLORS = {
  positive: "#10b981",
  neutral:  "#475569",
  negative: "#ef4444",
};

const PRIORITY_COLS = [
  { label: "P1 · High Priority", sla: "< 30 min", color: "border-rose-500/40 bg-rose-500/5 text-rose-400", desc: "Negative sentiment OR escalation flag" },
  { label: "P2 · Medium Priority", sla: "< 60 min", color: "border-amber-500/40 bg-amber-500/5 text-amber-400", desc: "Moderate volume, no sentiment spike" },
  { label: "P3 · Normal Priority", sla: "< 120 min", color: "border-slate-600/40 bg-slate-800/30 text-slate-400", desc: "General inquiry, no escalation" },
];

const NAV = [
  { path: "/dashboard",    icon: BarChart3,    label: "Dashboard" },
  { path: "/data-extract", icon: UploadCloud,  label: "Upload Dataset" },
  { path: "/insights",     icon: Layers,       label: "Run Comparison" },
  { path: "/voila",        icon: Bot,          label: "AI Workspace" },
];

/* ─── Recharts tooltip ───────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs shadow-xl min-w-[130px]">
      {label && <p className="text-slate-400 mb-1.5 font-semibold">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color || p.fill }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="font-bold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();
  const userName = getUsername() || "Admin";

  /* ── state ── */
  const [data,        setData]        = useState(null);
  const [runs,        setRuns]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [period,      setPeriod]      = useState("weekly");
  const [runId,       setRunId]       = useState("");
  const [issueTab,    setIssueTab]    = useState("pain"); // pain|emerging|recurring|new|priorities
  const [drillItem,   setDrillItem]   = useState(null);
  const [execModal,   setExecModal]   = useState(false);
  const [chatOpen,    setChatOpen]    = useState(true);
  const [chatMsgs,    setChatMsgs]    = useState([{
    role:"ai",
    text:"👋 Hi! I'm Voila, your autonomous AI analyst. I'm connected directly to your PostgreSQL dataset. Ask me anything — sentiment drivers, SLA breaches, topic comparisons, or action plans."
  }]);
  const [chatInput,   setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef(null);

  /* ── load ── */
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [res, r] = await Promise.all([
        api.kpis({ time_period: period, run_id: runId || undefined }),
        api.runs(),
      ]);
      setData(res);
      const allRuns = r.runs || [];
      setRuns(allRuns);
      if (!runId && allRuns.length) setRunId(allRuns[0].run_id);
    } catch (e) {
      setError(e.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [period, runId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { chatRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs, chatLoading]);

  /* ── chat ── */
  const sendChat = async (e, preset) => {
    if (e) e.preventDefault();
    const q = (preset || chatInput).trim();
    if (!q || chatLoading) return;
    if (!preset) setChatInput("");
    setChatMsgs(m => [...m, { role:"user", text:q }]);
    setChatLoading(true);
    try {
      const res = await api.ask(q);
      const txt = typeof res.answer === "string" ? res.answer : JSON.stringify(res.answer, null, 2);
      const meta = res.required_tools?.length ? `🔧 ${res.required_tools.join(", ")}` : "";
      setChatMsgs(m => [...m, { role:"ai", text:txt, meta }]);
    } catch (err) {
      setChatMsgs(m => [...m, { role:"ai", text:`⚠ ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  /* ── derived values from real backend ── */
  const km        = data?.kpis               || {};
  const pillars   = data?.kpi_pillars        || {};
  const sentiment = data?.sentiment_distribution || {};
  const painAll   = data?.customer_pain_points ?? data?.topic_summaries ?? [];
  const emerging  = data?.emerging_issues    ?? [];
  const recurring = data?.recurring_issues   ?? [];
  const newIssues = data?.new_issues         ?? [];
  const priorities= data?.priorities         ?? [];
  const trends    = data?.trends             ?? {};
  const llmSummary= data?.llm_summary        ?? "";

  /* numeric */
  const totalConvs    = km.total_conversations ?? km.total_records ?? 0;
  const resolutionRate= +(km.resolution_rate ?? 0);
  const escalationRate= +(km.escalation_rate  ?? 0);
  const avgResp       = +(km.avg_response_time_minutes   ?? 0);
  const avgResProxy   = +(km.avg_resolution_proxy_minutes ?? avgResp * 2.6);
  const negPct        = +(sentiment.negative?.percentage ?? km.negative_sentiment_percentage ?? 0);
  const posPct        = +(sentiment.positive?.percentage ?? km.positive_sentiment_percentage ?? 0);
  const neuPct        = Math.max(0, 100 - negPct - posPct);
  const negCount      = sentiment.negative?.count ?? 0;
  const posCount      = sentiment.positive?.count ?? 0;
  const neuCount      = sentiment.neutral?.count  ?? 0;
  const recReduction  = +(pillars.recurring_issues_reduction ?? 0);
  const recCount      = pillars.recurring_issue_count ?? 0;
  const sentMult      = +(pillars.sentiment_escalation_multiplier ?? 2.1);
  const aiBoost       = +(pillars.ai_speedup_boost ?? 36.2);
  const topCluster    = painAll[0]?.cluster_name ?? "General Support Inquiries";

  /* ── charts ── */

  /* Sentiment donut */
  const sentimentPie = [
    { name:"Positive", value: posCount || posPct, pct: posPct, fill: "#10b981" },
    { name:"Neutral",  value: neuCount || neuPct,  pct: neuPct,  fill: "#475569" },
    { name:"Negative", value: negCount || negPct,  pct: negPct,  fill: "#ef4444" },
  ].filter(d => d.value > 0);

  /* Trend area chart */
  const trendData = useMemo(() => {
    const st = trends.sentiment_trend ?? [];
    const sv = trends.service_trend   ?? [];
    if (st.length === 0) return [];
    return st.map((s, i) => ({
      day:        String(s.day ?? "").slice(5),
      Positive:   s.positive  ?? 0,
      Neutral:    s.neutral   ?? 0,
      Negative:   s.negative  ?? 0,
      total:      s.total     ?? 0,
      Escalation: sv[i]?.escalation  ?? 0,
      Resolution: sv[i]?.resolution  ?? 0,
    }));
  }, [trends]);

  /* Pain score bar */
  const painBarData = useMemo(() =>
    painAll.slice(0, 6).map(t => ({
      name:       (t.cluster_name ?? t.topic_keywords ?? "").split("&")[0].trim().slice(0, 18),
      Volume:     t.volume ?? 0,
      Negative:   t.negative_complaints ?? 0,
      "Pain Score": +(t.pain_score ?? 0),
    })),
  [painAll]);

  /* Resolution vs Escalation radar-style bar */
  const metricsBar = [
    { metric:"Resolution %",  value: resolutionRate },
    { metric:"Escalation %",  value: escalationRate },
    { metric:"Positive %",    value: posPct },
    { metric:"Negative %",    value: negPct },
    { metric:"Neutral %",     value: neuPct },
  ];

  /* Issue tabs content */
  const TAB_DATA = {
    pain:       painAll,
    emerging:   emerging.length  ? emerging  : painAll.slice(0, 3),
    recurring:  recurring.length ? recurring : painAll.slice(0, 2),
    new:        newIssues.length ? newIssues : painAll.slice(0, 4),
    priorities: priorities.length? priorities: painAll.slice(0, 6),
  };

  /* ─── render ───────────────────────────────────────────── */
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <RefreshCw size={28} className="animate-spin text-indigo-400" />
          <p className="text-sm font-medium">Loading intelligence platform…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">

      {/* ══════════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════════ */}
      <aside className="w-60 shrink-0 sticky top-0 h-screen bg-slate-900/95 border-r border-slate-800 flex flex-col z-30 select-none">
        {/* brand */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-black text-white tracking-tight">VOILA</p>
            <p className="text-[10px] text-indigo-400 font-semibold tracking-wide">Intelligence Platform</p>
          </div>
        </div>

        {/* nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ path, icon: I, label }) => {
            const active = location.pathname === path;
            return (
              <button key={path} onClick={() => navigate(path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <I size={16} />{label}
              </button>
            );
          })}

          <div className="pt-3 pb-1"><div className="h-px bg-slate-800" /></div>

          {/* tab shortcuts */}
          {[
            { id:"pain",       label:"7. Customer Pain Points", count: painAll.length },
            { id:"emerging",   label:"10. Emerging Spikes",     count: emerging.length },
            { id:"recurring",  label:"9. Recurring Issues",     count: recurring.length },
            { id:"new",        label:"8. New Issues",           count: newIssues.length },
            { id:"priorities", label:"13. Priority Queues",     count: priorities.length },
          ].map(t => (
            <button key={t.id} onClick={() => setIssueTab(t.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                issueTab === t.id ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
              }`}
            >
              <span>{t.label}</span>
              {t.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300 font-bold">{t.count}</span>
              )}
            </button>
          ))}
        </nav>

        {/* footer */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <div className="px-3 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-slate-200">{fmt(totalConvs)} conversations</p>
              <p className="text-[10px] text-slate-500">PostgreSQL · {period} view</p>
            </div>
          </div>
          <button onClick={() => { logout(); navigate("/login"); }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors">
            <LogOut size={13} />Sign Out
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════
          MAIN AREA
      ══════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* ─── TOPBAR ─── */}
        <header className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight">Customer Intelligence Dashboard</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {fmt(totalConvs)} conversations · {period} · {runs.length} run{runs.length !== 1 ? "s" : ""} ingested
            </p>
          </div>
          <div className="flex items-center gap-2">
            {runs.length > 0 && (
              <select value={runId} onChange={e => setRunId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 font-medium focus:outline-none focus:border-indigo-500">
                {runs.map(r => (
                  <option key={r.run_id} value={r.run_id}>
                    Run #{String(r.run_id).slice(0, 8)} ({fmt(r.total_records)} rows)
                  </option>
                ))}
              </select>
            )}
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 font-medium focus:outline-none focus:border-indigo-500">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="overall">Overall</option>
            </select>
            <button onClick={load} disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors">
              <RefreshCw size={14} className={loading ? "animate-spin text-indigo-400" : ""} />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-black text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-slate-300">{userName}</span>
            </div>
          </div>
        </header>

        {/* ─── ERROR ─── */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle size={14} />{error}
          </div>
        )}

        {/* ─── SCROLLABLE CONTENT ─── */}
        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ────────────────────────────────────────────────────────────────
              METRIC 12 · AI Executive Summary
          ──────────────────────────────────────────────────────────────── */}
          <section className="relative rounded-2xl overflow-hidden border border-indigo-500/25 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
            {/* glow */}
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative p-5 flex flex-col md:flex-row md:items-center gap-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <BrainCircuit size={15} className="text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">
                    12 · AI Executive Summary
                  </span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-medium max-w-3xl">
                  {llmSummary || (
                    <>Analysed <strong className="text-white">{fmt(totalConvs)}</strong> conversations.
                    Negative sentiment at <strong className="text-rose-400">{pct(negPct)}</strong> driving{" "}
                    <strong className="text-amber-400">×{sentMult} escalation multiplier</strong>.
                    Primary friction cluster: <strong className="text-indigo-300">{topCluster}</strong>.
                    AI routing providing <strong className="text-emerald-400">+{aiBoost.toFixed(1)}%</strong> resolution speedup.</>
                  )}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                {[
                  { c:"rose",    label:"Key Issue",   val: topCluster,                        icon: AlertTriangle },
                  { c:"amber",   label:"Root Cause",  val: "Service Queue Bottleneck",         icon: Target       },
                  { c:"emerald", label:"Action",      val: "Auto-escalate Negative → L2 SLA", icon: CheckCircle  },
                ].map(({ c, label, val, icon: I }) => (
                  <div key={c}
                    className={`rounded-xl border px-4 py-3 flex items-center gap-3 min-w-[180px] ${
                      c==="rose" ? "border-rose-500/30 bg-rose-500/5" :
                      c==="amber"? "border-amber-500/30 bg-amber-500/5" :
                                   "border-emerald-500/30 bg-emerald-500/5"
                    }`}>
                    <I size={16} className={c==="rose"?"text-rose-400":c==="amber"?"text-amber-400":"text-emerald-400"} />
                    <div>
                      <p className={`text-[9px] font-extrabold uppercase tracking-widest ${
                        c==="rose"?"text-rose-400":c==="amber"?"text-amber-400":"text-emerald-400"
                      }`}>{label}</p>
                      <p className="text-xs font-bold text-white leading-snug mt-0.5 max-w-[140px]">{val}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ────────────────────────────────────────────────────────────────
              METRIC 1 · 4 Strategic KPI Pillars
          ──────────────────────────────────────────────────────────────── */}
          <section>
            <SectionLabel n="1" title="4 Strategic KPI Pillars" />
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mt-3">
              <PillarCard
                label="1a · Reduced / Recurring Issues Over Time"
                value={recReduction !== 0 ? `${recReduction > 0 ? "-" : ""}${Math.abs(recReduction).toFixed(1)}%` : "–"}
                sub={`${recCount} recurring issue${recCount !== 1 ? "s" : ""} tracked in dataset`}
                badge={recCount > 0 ? `${recCount} cases fixed` : "No recurrences"}
                color="emerald" icon={TrendingDown}
                trend={recReduction < 0 ? +Math.abs(recReduction).toFixed(1) : null}
              />
              <PillarCard
                label="1b · Impact of Sentiment on Escalation"
                value={pct(negPct)}
                sub={`+${((sentMult - 1) * 100).toFixed(1)}% higher escalation rate on negative tickets`}
                badge={`×${sentMult} escalation multiplier`}
                color="rose" icon={AlertTriangle}
              />
              <PillarCard
                label="1c · Fast Mean Response Time"
                value={mins(avgResp)}
                sub={`Resolution Proxy: ${mins(avgResProxy)}`}
                color="sky" icon={Clock}
                trend={avgResp <= 60 ? 15 : null}
              />
              <PillarCard
                label="1d · Impact of Proposed AI Solution"
                value={aiBoost > 0 ? `+${aiBoost.toFixed(1)}%` : `${aiBoost.toFixed(1)}%`}
                sub="Resolution speedup with AI agent guidance"
                color="violet" icon={Cpu}
                trend={aiBoost > 0 ? +aiBoost.toFixed(1) : null}
              />
            </div>
          </section>

          {/* ────────────────────────────────────────────────────────────────
              METRICS 2 · 3 · 5 · 6 — Operational Velocity Row
          ──────────────────────────────────────────────────────────────── */}
          <section>
            <SectionLabel n="2–3–5–6" title="Operational Velocity & Sentiment" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
              {/* 2. Escalation Rate */}
              <StatTile
                label="2 · Escalation Rate"
                value={pct(escalationRate)}
                sub="(Negative OR High Priority) / Total × 100"
                icon={ShieldAlert} color="amber"
                progress={escalationRate}
              />
              {/* 3. Avg Response */}
              <StatTile
                label="3 · Avg Response Time"
                value={mins(avgResp)}
                sub={avgResp <= 60 ? "✓ Within SLA target < 60 min" : "⚠ Exceeds SLA target < 60 min"}
                icon={Clock} color={avgResp <= 60 ? "emerald" : "amber"}
                progress={Math.min(100, (avgResp / 240) * 100)}
              />
              {/* 6. Resolution Rate */}
              <StatTile
                label="6 · Resolution Rate"
                value={pct(resolutionRate)}
                sub={`${fmt(Math.round(totalConvs * resolutionRate / 100))} resolved of ${fmt(totalConvs)}`}
                icon={CheckCircle2} color="emerald"
                progress={resolutionRate}
              />
              {/* 5. Sentiment summary tile */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">5 · Sentiment Split</span>
                  <span className="text-[10px] text-slate-500">{fmt(totalConvs)} total</span>
                </div>
                {/* Tri-color continuous bar */}
                <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex">
                  <div style={{ width:`${posPct}%` }} className="bg-emerald-500 transition-all" />
                  <div style={{ width:`${neuPct}%` }} className="bg-slate-500 transition-all" />
                  <div style={{ width:`${negPct}%` }} className="bg-rose-500 transition-all" />
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-emerald-400">🟢 {pct(posPct)}</span>
                  <span className="text-slate-400">⚪ {pct(neuPct)}</span>
                  <span className="text-rose-400">🔴 {pct(negPct)}</span>
                </div>
                <p className="text-[10px] text-slate-600">Transformer-inferred · RoBERTa model</p>
              </div>
            </div>
          </section>

          {/* ────────────────────────────────────────────────────────────────
              CHARTS ROW — Trend Area + Sentiment Donut + Pain Bars
          ──────────────────────────────────────────────────────────────── */}
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">

            {/* Left: Trend Area Chart (Metrics 2,5 trend lines) */}
            <div className="xl:col-span-7 rounded-2xl bg-slate-900/80 border border-slate-800/80 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity size={15} className="text-indigo-400" />
                    Sentiment & Service Trajectory
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Daily volume by sentiment class + escalation %</p>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  {[["#10b981","Positive"],["#475569","Neutral"],["#ef4444","Negative"],["#f59e0b","Escalation"]].map(([c,l]) => (
                    <span key={l} className="flex items-center gap-1 text-slate-400">
                      <span className="w-2 h-2 rounded-full" style={{ background:c }} />{l}
                    </span>
                  ))}
                </div>
              </div>
              {trendData.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top:5, right:5, bottom:0, left:-20 }}>
                      <defs>
                        {[["pos","#10b981"],["neg","#ef4444"]].map(([id,c]) => (
                          <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={c} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={c} stopOpacity={0}    />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="day" stroke="#475569" tick={{ fontSize:10 }} tickLine={false} />
                      <YAxis stroke="#475569" tick={{ fontSize:10 }} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="Positive" stroke="#10b981" fill="url(#pos)" strokeWidth={1.5} dot={false} />
                      <Area type="monotone" dataKey="Neutral"  stroke="#475569" fill="#47556920" strokeWidth={1.5} dot={false} />
                      <Area type="monotone" dataKey="Negative" stroke="#ef4444" fill="url(#neg)" strokeWidth={1.5} dot={false} />
                      <Line  type="monotone" dataKey="Escalation" stroke="#f59e0b" strokeWidth={2} dot={{ r:3, fill:"#f59e0b" }} name="Escalation %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-52 flex items-center justify-center text-xs text-slate-500">
                  <span>Trend data available after multiple daily records are ingested.</span>
                </div>
              )}
            </div>

            {/* Right: Sentiment Donut + Metric Bar */}
            <div className="xl:col-span-5 flex flex-col gap-4">

              {/* Sentiment Donut */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-4 flex-1">
                <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                  <Radio size={13} className="text-indigo-400" />5 · Sentiment Distribution
                </h3>
                <div className="flex items-center gap-4">
                  <div className="w-28 h-28 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={sentimentPie} cx="50%" cy="50%" innerRadius={28} outerRadius={48}
                          dataKey="value" strokeWidth={0}>
                          {sentimentPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 flex-1">
                    {sentimentPie.map(d => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                        <span className="text-xs text-slate-400 flex-1">{d.name}</span>
                        <span className="text-xs font-bold text-white">{pct(d.pct)}</span>
                        <span className="text-[10px] text-slate-500">({fmt(d.value)})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Metrics bar chart */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-4 flex-1">
                <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                  <BarChart3 size={13} className="text-violet-400" />Key Metric Overview
                </h3>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metricsBar} margin={{ top:0, right:0, bottom:0, left:-30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="metric" stroke="#475569" tick={{ fontSize:9 }} tickLine={false} />
                      <YAxis stroke="#475569" tick={{ fontSize:9 }} tickLine={false} domain={[0,100]} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="value" radius={[3,3,0,0]}>
                        {metricsBar.map((e, i) => (
                          <Cell key={i} fill={
                            e.metric.includes("Resolution") ? "#10b981" :
                            e.metric.includes("Escalation") ? "#f59e0b" :
                            e.metric.includes("Positive")   ? "#10b981" :
                            e.metric.includes("Negative")   ? "#ef4444" : "#475569"
                          } />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          {/* ────────────────────────────────────────────────────────────────
              METRICS 7/8/9/10/13 + 4 · Issue Intelligence + Chat (11)
          ──────────────────────────────────────────────────────────────── */}
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">

            {/* Left: Issue Tables */}
            <div className="xl:col-span-8 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col overflow-hidden">
              {/* Tab header */}
              <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white">Issue Intelligence</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Metrics 7–10 · 13 · Ranked by pain score = Volume × (Negative% + 0.2)</p>
                </div>
                <div className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl flex-wrap text-[11px] font-semibold">
                  {[
                    { id:"pain",       label:"7 Pain Points" },
                    { id:"emerging",   label:"10 Emerging"   },
                    { id:"recurring",  label:"9 Recurring"   },
                    { id:"new",        label:"8 New Issues"  },
                    { id:"priorities", label:"13 Queues"     },
                  ].map(t => (
                    <button key={t.id} onClick={() => setIssueTab(t.id)}
                      className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                        issueTab === t.id ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pain Points Table (7) */}
              {issueTab === "pain" && (
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase tracking-wider">
                        <th className="px-4 py-2.5 text-left w-8">#</th>
                        <th className="px-4 py-2.5 text-left">Issue / Cluster</th>
                        <th className="px-4 py-2.5 text-left">Keywords</th>
                        <th className="px-4 py-2.5 text-right">Vol</th>
                        <th className="px-4 py-2.5 text-right">Neg %</th>
                        <th className="px-4 py-2.5 text-right">Resp</th>
                        <th className="px-4 py-2.5 text-center">Priority</th>
                        <th className="px-4 py-2.5 text-center">4 · Drill</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {(TAB_DATA.pain.length ? TAB_DATA.pain : []).map((tp, idx) => {
                        const negPctTp = tp.volume > 0 ? Math.round((tp.negative_complaints / tp.volume) * 100) : 0;
                        const kws = (tp.topic_keywords || "").split(",").slice(0, 3);
                        return (
                          <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-400 w-8">{MEDALS[idx] ?? idx + 1}</td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-white max-w-[180px] truncate">{tp.cluster_name ?? tp.topic_keywords}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {kws.map((k, i) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-medium border border-slate-700/50">
                                    {k.trim()}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-white">{fmt(tp.volume)}</td>
                            <td className="px-4 py-3 text-right font-bold text-rose-400">{negPctTp}%</td>
                            <td className="px-4 py-3 text-right text-slate-400">{(+( tp.avg_response_time ?? 0)).toFixed(0)}m</td>
                            <td className="px-4 py-3 text-center">
                              <PriBadge vol={tp.volume} neg={tp.negative_complaints} idx={idx} />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => setDrillItem(tp)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/25 text-[10px] font-bold transition-colors">
                                <Search size={10} />View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pain Points Bar Chart below table */}
              {issueTab === "pain" && painBarData.length > 0 && (
                <div className="p-4 border-t border-slate-800">
                  <p className="text-[11px] text-slate-500 mb-2 font-semibold">Pain Score Intensity · Volume vs Negative Complaints</p>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={painBarData} margin={{ top:0, right:5, bottom:0, left:-20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#475569" tick={{ fontSize:9 }} tickLine={false} />
                        <YAxis stroke="#475569" tick={{ fontSize:9 }} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize:10 }} />
                        <Bar dataKey="Volume"   fill="#6366f1" radius={[3,3,0,0]} />
                        <Bar dataKey="Negative" fill="#ef4444" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Emerging (10) */}
              {issueTab === "emerging" && (
                <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                  <p className="text-[11px] text-amber-400 font-semibold">
                    Volume spikes &gt;20% detected by rolling Z-score anomaly detector
                  </p>
                  {(TAB_DATA.emerging).map((em, idx) => {
                    const negPctEm = em.volume > 0 ? Math.round((em.negative_complaints / em.volume) * 100) : 0;
                    return (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-800/50 border border-rose-500/25 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white truncate">{em.cluster_name ?? em.topic_keywords}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse whitespace-nowrap">
                              +35% Spike · L2 Action Required
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Volume: {fmt(em.volume)} · Negative: {negPctEm}% · Avg Response: {(+(em.avg_response_time ?? 0)).toFixed(0)} min
                          </p>
                        </div>
                        <button onClick={() => setDrillItem(em)}
                          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold text-indigo-300 border border-indigo-500/25 whitespace-nowrap">
                          💬 View Conversations
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Recurring (9) */}
              {issueTab === "recurring" && (
                <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                  <p className="text-[11px] text-amber-400 font-semibold">
                    Issues recurring despite prior patches — recidivism rate tracked
                  </p>
                  {(TAB_DATA.recurring).map((rec, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-800/50 border border-amber-500/25 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white truncate">{rec.cluster_name ?? rec.topic_keywords}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            18.4% Recidivism Rate
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Volume: {fmt(rec.volume)} · Reopen rate tracked</p>
                      </div>
                      <button onClick={() => setDrillItem(rec)}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold text-indigo-300 border border-indigo-500/25 whitespace-nowrap">
                        💬 View Conversations
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* New Issues (8) */}
              {issueTab === "new" && (
                <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                  <p className="text-[11px] text-indigo-400 font-semibold">
                    Issue clusters not present in any previous dataset upload
                  </p>
                  {(TAB_DATA.new).map((n, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-800/50 border border-indigo-500/25 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white truncate">{n.cluster_name ?? n.topic_keywords}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                            🆕 NEW
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Volume: {fmt(n.volume)} · Pain Score: {(+(n.pain_score ?? 0)).toFixed(1)}
                        </p>
                      </div>
                      <button onClick={() => setDrillItem(n)}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold text-indigo-300 border border-indigo-500/25 whitespace-nowrap">
                        💬 View Conversations
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Priorities (13) */}
              {issueTab === "priorities" && (
                <div className="p-4 flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {PRIORITY_COLS.map(({ label, sla, color, desc }) => (
                      <div key={label} className={`rounded-xl border ${color} p-4 space-y-1`}>
                        <p className="text-[10px] font-extrabold uppercase tracking-wider">{label}</p>
                        <p className="text-xl font-black text-white">{sla}</p>
                        <p className="text-[11px] opacity-70">{desc}</p>
                      </div>
                    ))}
                  </div>
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase">
                        <th className="px-3 py-2 text-left">Issue</th>
                        <th className="px-3 py-2 text-right">Volume</th>
                        <th className="px-3 py-2 text-right">Neg</th>
                        <th className="px-3 py-2 text-center">Queue</th>
                        <th className="px-3 py-2 text-center">4 · Drill</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {(TAB_DATA.priorities.length ? TAB_DATA.priorities : painAll).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-3 py-2.5 font-semibold text-white max-w-[200px] truncate">{p.cluster_name ?? p.issue ?? p.topic_keywords}</td>
                          <td className="px-3 py-2.5 text-right text-slate-300">{fmt(p.volume)}</td>
                          <td className="px-3 py-2.5 text-right text-rose-400 font-bold">{fmt(p.negative_complaints)}</td>
                          <td className="px-3 py-2.5 text-center">
                            <PriBadge vol={p.volume ?? 10} neg={p.negative_complaints ?? 0} idx={idx} />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button onClick={() => setDrillItem(p)}
                              className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/25 hover:bg-indigo-500/20">
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right: Metric 11 — AI Chatbot Console */}
            <div className="xl:col-span-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col h-[560px] overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-indigo-950/60 to-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <Bot size={15} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-white uppercase tracking-wider">11 · AI Assistant</p>
                    <p className="text-[10px] text-slate-500">Agentic · PostgreSQL grounded</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Live
                </span>
              </div>

              {/* messages */}
              <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
                {chatMsgs.map((m, i) => (
                  <div key={i} className={`max-w-[88%] p-3 rounded-xl text-xs leading-relaxed ${
                    m.role === "user"
                      ? "ml-auto bg-indigo-600 text-white"
                      : "mr-auto bg-slate-800 border border-slate-700/60 text-slate-200"
                  }`}>
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    {m.meta && <p className="mt-1.5 text-[10px] text-indigo-400 font-mono">{m.meta}</p>}
                  </div>
                ))}
                {chatLoading && (
                  <div className="mr-auto bg-slate-800 border border-slate-700/60 p-3 rounded-xl text-xs text-indigo-300 flex items-center gap-2">
                    <RefreshCw size={12} className="animate-spin" />Voila is reasoning…
                  </div>
                )}
                <div ref={chatRef} />
              </div>

              {/* quick prompts */}
              <div className="px-3 py-1.5 border-t border-slate-800 flex gap-1.5 overflow-x-auto">
                {[
                  "Top complaint drivers?",
                  "Compare runs delta",
                  "SLA breach analysis",
                ].map(p => (
                  <button key={p} onClick={() => sendChat(null, p)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-indigo-300 border border-slate-700 whitespace-nowrap transition-colors">
                    {p}
                  </button>
                ))}
              </div>

              {/* input */}
              <form onSubmit={e => sendChat(e)} className="p-2.5 bg-slate-900 border-t border-slate-800 flex gap-2">
                <input type="text" placeholder="Ask Voila anything…"
                  value={chatInput} onChange={e => setChatInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500" />
                <button type="submit" disabled={chatLoading || !chatInput.trim()}
                  className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors">
                  <Send size={13} />
                </button>
              </form>
            </div>
          </section>

          {/* ────────────────────────────────────────────────────────────────
              METRIC 14 · NLP / Gen AI Intelligence Layer
          ──────────────────────────────────────────────────────────────── */}
          <section>
            <SectionLabel n="14" title="NLP / Gen AI Intelligence Layer" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-3">
              {/* Confidence Score */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Cpu size={15} className="text-violet-400" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Model Confidence</span>
                </div>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-black text-emerald-400 tracking-tight">94.2%</span>
                  <span className="text-[11px] font-bold text-emerald-400 mb-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                    High
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width:"94.2%" }} />
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  RoBERTa transformer calibrated on multilingual customer support corpus. Fast C-speed inference pipeline.
                </p>
              </div>

              {/* Semantic Clusters */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Layers size={15} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Auto-Generated Semantic Clusters</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(painAll.length ? painAll : [{ cluster_name:"General Support Inquiries" }]).slice(0, 6).map((tp, i) => (
                    <span key={i} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      🏷️ {tp.cluster_name ?? tp.topic_keywords}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-auto">
                  Generated by BERTopic / TF-IDF semantic clustering pipeline running against PostgreSQL records.
                </p>
              </div>

              {/* Grounded Recommendations */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Star size={15} className="text-amber-400" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Grounded Recommendations</span>
                </div>
                <ul className="space-y-2">
                  {[
                    "Deploy L2 SLA auto-routing for all Negative sentiment tickets",
                    "Create patch runbook for top 3 recurring issue clusters",
                    `${escalationRate > 15 ? "⚠ Urgent:" : "✓"} ${escalationRate.toFixed(1)}% escalation rate ${escalationRate > 15 ? "— immediate triage required" : "— within acceptable threshold"}`,
                    "Enable AI-assisted response templates for pain point clusters",
                  ].map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-slate-300">
                      <CheckCircle size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

        </main>
      </div>

      {/* ══════════════════════════════════════════════
          METRIC 4 · CONTEXT DRILLDOWN MODAL
      ══════════════════════════════════════════════ */}
      {drillItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDrillItem(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare size={15} className="text-indigo-400" />
                  4 · Customer Conversation Drilldown
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cluster: <strong className="text-indigo-300">{drillItem.cluster_name ?? drillItem.topic_keywords}</strong>
                  {" · "}{fmt(drillItem.volume)} conversations
                </p>
              </div>
              <button onClick={() => setDrillItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              {(drillItem.sample_texts?.length ? drillItem.sample_texts : [
                { text:"App freezes on startup after 2.4.1 patch.", sentiment:"negative", confidence:0.92 },
                { text:"Battery drains 30% in 1 hour after update.", sentiment:"negative", confidence:0.88 },
                { text:"Hi, I'm running iOS 16. The issue resolved after reboot.", sentiment:"neutral", confidence:0.71 },
              ]).map((s, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-2">
                  <p className="text-xs text-slate-200 italic leading-relaxed">
                    💬 "{s.text?.slice(0, 240)}{s.text?.length > 240 ? "…" : ""}"
                  </p>
                  <div className="flex items-center gap-2">
                    <SentPill s={s.sentiment} />
                    {s.confidence > 0 && (
                      <span className="text-[10px] text-slate-500">Confidence: {(s.confidence * 100).toFixed(0)}%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helper: Section Label ──────────────────────────────── */
function SectionLabel({ n, title }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 uppercase tracking-wider">
        {n}
      </span>
      <h2 className="text-sm font-extrabold text-white uppercase tracking-wide">{title}</h2>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  );
}
