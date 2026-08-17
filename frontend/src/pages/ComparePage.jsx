import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  AlertTriangle,
  Database,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BarChart2,
  BarChart3,
  Zap,
  Activity,
  Target,
  PieChart,
  Eye,
  Sliders
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  ReferenceLine,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '../api/analytics';
import { useRun } from '../context/RunContext';
import { useTheme } from '../context/ThemeContext';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ConfidenceBadge } from '../components/common/ConfidenceBadge';
import { ProxyMethodologyModal } from '../components/dashboard/ProxyMethodologyModal';

function getCleanClusterName(raw) {
  if (!raw) return 'General Support Inquiries';
  const kw = raw.toLowerCase();
  if (kw.includes('crash') || kw.includes('freeze') || kw.includes('bug') || kw.includes('stability')) return 'App Crashes & System Stability';
  if (kw.includes('delivery') || kw.includes('order') || kw.includes('track') || kw.includes('delay') || kw.includes('shipment')) return 'Delivery, Order Tracking & Delays';
  if (kw.includes('bill') || kw.includes('charge') || kw.includes('invoice') || kw.includes('payment')) return 'Billing, Invoices & Payment Inquiries';
  if (kw.includes('login') || kw.includes('password') || kw.includes('auth') || kw.includes('2fa') || kw.includes('account')) return 'Account Access & Password Authentication';
  if (kw.includes('refund') || kw.includes('cancel') || kw.includes('dispute') || kw.includes('return')) return 'Refunds, Cancellations & Dispute Resolution';
  if (kw.includes('battery') || kw.includes('hardware') || kw.includes('drain')) return 'Hardware & Battery Health Performance';
  if (kw.includes('thank') || kw.includes('help') || kw.includes('praise') || kw.includes('assist')) return 'Customer Service Praise & Quick Help';
  return raw.replace(/_/g, ' ');
}

export function ComparePage() {
  const { runs, activeRunId, totalCombinedRecords, isLoadingRuns, dateRangeInfo, selectedCompany, filters } = useRun();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const hasData = (runs && runs.length > 0) || (totalCombinedRecords || 0) > 0;
  React.useEffect(() => {
    if (!isLoadingRuns && !hasData) {
      navigate('/', { replace: true });
    }
  }, [isLoadingRuns, hasData, navigate]);
  const [compareMode, setCompareMode] = useState('runs'); // 'runs' | 'years'
  const [activeChartTab, setActiveChartTab] = useState('benchmark'); // 'benchmark' | 'variance' | 'radar'
  const [currentRunId, setCurrentRunId] = useState(activeRunId === 'all' ? (runs[0]?.run_id || '') : activeRunId);
  const [previousRunId, setPreviousRunId] = useState(runs[1]?.run_id || runs[0]?.run_id || '');
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  
  const years = dateRangeInfo?.available_years?.length > 0 ? dateRangeInfo.available_years : [2023, 2024, 2025];
  const [yearA, setYearA] = useState(years[0] || 2023);
  const [yearB, setYearB] = useState(years[years.length - 1] || 2024);

  // Fetch comparison analytics payload with company/dimension filter
  const { data: compareData, isLoading } = useQuery({
    queryKey: ['compare_runs_page', compareMode, currentRunId, previousRunId, yearA, yearB, selectedCompany, filters],
    queryFn: () => analyticsApi.compareRuns({
      current_run_id: compareMode === 'runs' ? currentRunId : undefined,
      previous_run_id: compareMode === 'runs' ? previousRunId : undefined,
      year_a: compareMode === 'years' ? yearA : undefined,
      year_b: compareMode === 'years' ? yearB : undefined,
      company: selectedCompany || filters?.company || undefined,
      product: filters?.product || undefined,
      region: filters?.region || undefined
    }),
    enabled: true,
    placeholderData: (prev) => prev,
    staleTime: 60000,
  });

  const delta = compareData?.delta || compareData?.comparison_summary || {};
  const topicEvol = compareData?.topic_evolution || {};
  const comparisonLabel = compareMode === 'runs'
    ? `Run Delta: ${currentRunId?.slice(0, 8) || 'T1'} vs ${previousRunId?.slice(0, 8) || 'T0'}`
    : `Multi-Year Variance: ${yearB} vs ${yearA}`;

  const metricsList = [
    { key: 'avg_response_time_minutes', altKey: 'response_time_minutes', label: 'Average SLA Response Speed', shortLabel: 'Response Latency', unit: ' min', isGoodHigh: false, confidence: 'measured' },
    { key: 'resolution_rate', label: 'Resolution Rate (FCR Proxy)', shortLabel: 'Resolution (FCR)', unit: '%', isGoodHigh: true, confidence: 'proxy' },
    { key: 'csat_proxy', label: 'CSAT Satisfaction Index', shortLabel: 'CSAT Score', unit: '%', isGoodHigh: true, confidence: 'proxy' },
    { key: 'reopen_rate', label: 'Reopen Rate', shortLabel: 'Reopen Rate', unit: '%', isGoodHigh: false, confidence: 'proxy' },
    { key: 'escalation_rate', label: 'Escalation Rate', shortLabel: 'Escalation Rate', unit: '%', isGoodHigh: false, confidence: 'proxy' },
    { key: 'negative_sentiment_percentage', label: 'Negative Tone Share', shortLabel: 'Negative Friction', unit: '%', isGoodHigh: false, confidence: 'measured' },
    { key: 'positive_sentiment_percentage', label: 'Positive Tone Share', shortLabel: 'Positive Tone', unit: '%', isGoodHigh: true, confidence: 'measured' },
  ];

  // Top 4 Executive KPI Callout Cards
  const kpiShiftCards = useMemo(() => {
    const getCard = (key, altKey, label, isGoodHigh, unit) => {
      const row = delta[key] || (altKey && delta[altKey]) || {};
      const t0 = Number(row.previous ?? 0);
      const t1 = Number(row.current ?? 0);
      const diff = Number(row.delta ?? 0);
      const pct = Number(row.percentage_change ?? 0);
      const isFavorable = isGoodHigh ? diff > 0 : diff < 0;
      return { 
        label, 
        t0: t0.toFixed(1), 
        t1: t1.toFixed(1), 
        diff: (diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)), 
        pct: (pct > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`), 
        isFavorable, 
        unit 
      };
    };
    return [
      getCard('avg_response_time_minutes', 'response_time_minutes', 'SLA Response Speed', false, 'm'),
      getCard('resolution_rate', null, 'First-Contact Resolution', true, '%'),
      getCard('csat_proxy', null, 'CSAT Satisfaction Index', true, '%'),
      getCard('negative_sentiment_percentage', null, 'Friction & Complaint Tone', false, '%'),
    ];
  }, [delta]);

  // Prepare chart data for variance visualization (memoized)
  const chartData = useMemo(() => {
    return metricsList.map((m) => {
      const row = delta[m.key] || (m.altKey && delta[m.altKey]) || {};
      const t0 = Number(row.previous ?? 0);
      const t1 = Number(row.current ?? 0);
      const pct = Number(row.percentage_change ?? 0);
      const diff = Number(row.delta ?? 0);
      const isPositiveDiff = diff > 0;
      const isFavorable = m.isGoodHigh ? isPositiveDiff : !isPositiveDiff;
      return {
        metric: m.label,
        shortLabel: m.shortLabel,
        t0: Number(t0.toFixed(1)),
        t1: Number(t1.toFixed(1)),
        pctVariance: Number(pct.toFixed(1)),
        isFavorable,
        diff: Number(diff.toFixed(1)),
        unit: m.unit,
        confidence: m.confidence
      };
    });
  }, [delta]);

  // Normalized 360-degree radar comparison data
  const radarData = useMemo(() => {
    const getVal = (key, altKey) => {
      const row = delta[key] || (altKey && delta[altKey]) || {};
      return { t0: Number(row.previous ?? 0), t1: Number(row.current ?? 0) };
    };
    
    const resp = getVal('avg_response_time_minutes', 'response_time_minutes');
    const fcr = getVal('resolution_rate');
    const csat = getVal('csat_proxy');
    const reopen = getVal('reopen_rate');
    const esc = getVal('escalation_rate');
    const pos = getVal('positive_sentiment_percentage');

    return [
      { pillar: 'Response Speed', T0: Math.max(10, Math.min(100, Math.round(100 - resp.t0 * 1.5))), T1: Math.max(10, Math.min(100, Math.round(100 - resp.t1 * 1.5))), fullMark: 100 },
      { pillar: 'Resolution (FCR)', T0: Math.round(fcr.t0), T1: Math.round(fcr.t1), fullMark: 100 },
      { pillar: 'CSAT Satisfaction', T0: Math.round(csat.t0), T1: Math.round(csat.t1), fullMark: 100 },
      { pillar: 'Customer Retention', T0: Math.max(0, Math.round(100 - reopen.t0 * 2)), T1: Math.max(0, Math.round(100 - reopen.t1 * 2)), fullMark: 100 },
      { pillar: 'Escalation Control', T0: Math.max(0, Math.round(100 - esc.t0 * 2)), T1: Math.max(0, Math.round(100 - esc.t1 * 2)), fullMark: 100 },
      { pillar: 'Positive Tone Share', T0: Math.round(pos.t0), T1: Math.round(pos.t1), fullMark: 100 },
    ];
  }, [delta]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-6 pb-16"
    >
      {/* Proxy Transparency Modal */}
      <ProxyMethodologyModal 
        isOpen={isMethodologyOpen} 
        onClose={() => setIsMethodologyOpen(false)} 
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl glass-card">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 text-white shadow-md shadow-rose-500/20">
            <GitCompare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl text-slate-900 dark:text-white tracking-tight">
              Dataset Delta & Multi-Year Variance
            </h1>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
              Inspect statistical drift, KPI variances, and topic shifts between dataset uploads or calendar years.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMethodologyOpen(true)}
            className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="View mathematical formulas and proxy derivations"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Proxy Transparency</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/[0.04] p-1.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono text-xs shadow-2xs">
            <button
              onClick={() => setCompareMode('runs')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                compareMode === 'runs'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Upload vs. Upload
            </button>
            <button
              onClick={() => setCompareMode('years')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                compareMode === 'years'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Year vs. Year
            </button>
          </div>
        </div>
      </div>

      {/* Selectors Card */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.4 }}
        className="p-6 rounded-2xl glass-card space-y-4"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
          <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>{compareMode === 'runs' ? 'Select Dataset Upload Runs to Compare' : 'Select Calendar Years to Compare'}</span>
          </h3>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Comparing T1 (Target) against T0 (Baseline)
          </span>
        </div>

        {compareMode === 'runs' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold">
                Target Period (T1) — Newer Window
              </label>
              <select
                value={currentRunId}
                onChange={(e) => setCurrentRunId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-600 transition-all cursor-pointer shadow-2xs"
              >
                {runs.length === 0 ? (
                  <option value="">Global Active Ingestion (All Rows)</option>
                ) : (
                  runs.map((r, idx) => (
                    <option key={r.run_id} value={r.run_id}>
                      Run #{idx + 1} · {r.run_id.slice(0, 8)} ({r.total_records?.toLocaleString()} msgs)
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold">
                Baseline Period (T0) — Historical Window
              </label>
              <select
                value={previousRunId}
                onChange={(e) => setPreviousRunId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-600 transition-all cursor-pointer shadow-2xs"
              >
                {runs.length === 0 ? (
                  <option value="">Historical Baseline</option>
                ) : (
                  runs.map((r, idx) => (
                    <option key={r.run_id} value={r.run_id}>
                      Run #{idx + 1} · {r.run_id.slice(0, 8)} ({r.total_records?.toLocaleString()} msgs)
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold">
                Target Comparison Year (T1)
              </label>
              <select
                value={yearB}
                onChange={(e) => setYearB(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-600 transition-all cursor-pointer shadow-2xs"
              >
                {years.map((yr) => (
                  <option key={yr} value={yr}>Year {yr}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold">
                Baseline Comparison Year (T0)
              </label>
              <select
                value={yearA}
                onChange={(e) => setYearA(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-600 transition-all cursor-pointer shadow-2xs"
              >
                {years.map((yr) => (
                  <option key={yr} value={yr}>Year {yr}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </motion.div>

      {/* Comparison Results */}
      {isLoading ? (
        <LoadingSkeleton rows={4} height="h-28" />
      ) : (
        <div className="space-y-6">
          {/* ── 4 Executive Shift KPI Metric Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiShiftCards.map((card, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-2xl glass-card border border-slate-200/90 dark:border-white/10 flex flex-col justify-between space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                    {card.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                    card.isFavorable 
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}>
                    {card.isFavorable ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{card.pct}</span>
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-slate-400 block uppercase">T0 (Baseline)</span>
                    <span className="text-sm font-mono font-bold text-slate-600 dark:text-slate-400">
                      {card.t0}{card.unit}
                    </span>
                  </div>

                  <div className="text-slate-300 dark:text-slate-700 font-mono text-sm">➔</div>

                  <div className="space-y-0.5 text-right">
                    <span className="text-[10px] font-mono text-indigo-500 dark:text-indigo-400 block uppercase font-bold">T1 (Target)</span>
                    <span className="text-base font-mono font-black text-slate-900 dark:text-white">
                      {card.t1}{card.unit}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Absolute Shift</span>
                  <span className={`font-bold ${card.isFavorable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {card.diff}{card.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Multi-Mode Comparative Performance Visualizer ── */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.4 }}
            className="p-6 rounded-2xl glass-card space-y-4"
          >
            {/* Header & Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 gap-3">
              <div>
                <h3 className="font-display font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Comparative Performance Analytics & Shift Dynamics</span>
                </h3>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {activeChartTab === 'benchmark' && 'Side-by-side metric comparison across Baseline (T0) vs. Target (T1) windows'}
                  {activeChartTab === 'variance' && 'Normalized relative delta (% variance) shift across operational metrics'}
                  {activeChartTab === 'radar' && 'Multi-pillar 360° efficiency coverage comparing operational strength across dimensions'}
                </p>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200/80 dark:border-white/10 font-mono text-xs">
                <button
                  onClick={() => setActiveChartTab('benchmark')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeChartTab === 'benchmark'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Benchmark Bars</span>
                </button>

                <button
                  onClick={() => setActiveChartTab('variance')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeChartTab === 'variance'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Variance Delta (%)</span>
                </button>

                <button
                  onClick={() => setActiveChartTab('radar')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeChartTab === 'radar'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Radar Map</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Grouped Dual-Track Benchmark Bars */}
            {activeChartTab === 'benchmark' && (
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 15, right: 20, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
                    <XAxis 
                      dataKey="shortLabel" 
                      tick={{ fill: isDark ? '#94a3b8' : '#334155', fontSize: 11, fontWeight: 600, fontFamily: 'monospace' }} 
                      axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: isDark ? '#64748b' : '#64748b', fontSize: 10, fontFamily: 'monospace' }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#1e293b' : '#e2e8f0',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: isDark ? '#ffffff' : '#0f172a',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      }}
                      formatter={(val, name, item) => [
                        `${val}${item.payload.unit}`,
                        name === 't0' ? 'T0 Baseline' : 'T1 Target'
                      ]}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontFamily: 'monospace' }}
                      formatter={(value) => value === 't0' ? 'T0 Baseline' : 'T1 Target (Active Window)'}
                    />
                    <Bar dataKey="t0" fill={isDark ? '#6366f1' : '#818cf8'} name="t0" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="t1" fill={isDark ? '#10b981' : '#059669'} name="t1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* TAB 2: Dynamic Diverging Percentage Variance Waterfall */}
            {activeChartTab === 'variance' && (
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {(() => {
                    const vals = chartData.map(d => Math.abs(d.pctVariance)).filter(v => isFinite(v));
                    const maxAbs = Math.max(...vals, 10);
                    const domainLimit = Math.ceil(maxAbs * 1.15);
                    return (
                      <BarChart data={chartData} margin={{ top: 15, right: 20, left: 0, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
                        <XAxis 
                          dataKey="shortLabel" 
                          tick={{ fill: isDark ? '#94a3b8' : '#334155', fontSize: 11, fontWeight: 600, fontFamily: 'monospace' }} 
                          axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                          tickLine={false}
                        />
                        <YAxis 
                          domain={[-domainLimit, domainLimit]}
                          tick={{ fill: isDark ? '#64748b' : '#64748b', fontSize: 10, fontFamily: 'monospace' }} 
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? '#0f172a' : '#ffffff',
                            borderColor: isDark ? '#1e293b' : '#e2e8f0',
                            borderRadius: '0.75rem',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            color: isDark ? '#ffffff' : '#0f172a',
                          }}
                          formatter={(val, name, item) => [
                            `${val > 0 ? `+${val}` : val}% (Shift: ${item.payload.diff > 0 ? `+${item.payload.diff}` : item.payload.diff}${item.payload.unit})`,
                            item.payload.isFavorable ? 'Operational Gain' : 'Operational Friction'
                          ]}
                        />
                        <ReferenceLine y={0} stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth={1.5} />
                        <Bar dataKey="pctVariance" radius={[4, 4, 0, 0]} maxBarSize={36}>
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.pctVariance === 0 ? '#94a3b8' : (entry.isFavorable ? '#10b981' : '#f43f5e')} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    );
                  })()}
                </ResponsiveContainer>
              </div>
            )}

            {/* TAB 3: Multi-Pillar 360-Degree Radar Map */}
            {activeChartTab === 'radar' && (
              <div className="h-80 w-full pt-2 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                    <PolarGrid stroke={isDark ? '#475569' : '#cbd5e1'} />
                    <PolarAngleAxis 
                      dataKey="pillar" 
                      tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }} 
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]} 
                      tick={{ fill: isDark ? '#64748b' : '#94a3b8', fontSize: 9, fontFamily: 'monospace' }} 
                    />
                    <Radar 
                      name="T0 Baseline" 
                      dataKey="T0" 
                      stroke="#8b5cf6" 
                      fill="#8b5cf6" 
                      fillOpacity={0.25} 
                      strokeWidth={2}
                    />
                    <Radar 
                      name="T1 Target (Active Window)" 
                      dataKey="T1" 
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.45} 
                      strokeWidth={2}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center" 
                      wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontFamily: 'monospace' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#1e293b' : '#e2e8f0',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: isDark ? '#ffffff' : '#0f172a',
                      }}
                      formatter={(val, name) => [`${val} / 100 Index`, name]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>

          {/* Comparison Matrix Table */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.4 }}
            className="p-6 rounded-2xl glass-card space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-display font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Side-by-Side Metric Variance Matrix</span>
                <span className="text-xs font-mono px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 font-bold">
                  {comparisonLabel}
                </span>
              </h3>
              <ConfidenceBadge confidence="measured" size="sm" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 font-bold">Metric Evaluated</th>
                    <th className="py-3 px-4 font-bold">Baseline (T0)</th>
                    <th className="py-3 px-4 font-bold">Target (T1)</th>
                    <th className="py-3 px-4 font-bold">Absolute Delta</th>
                    <th className="py-3 px-4 font-bold">% Variance</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold">Causal Diagnostic Analysis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {metricsList.map((m) => {
                    const row = delta[m.key] || (m.altKey && delta[m.altKey]) || {};
                    const cur = row.current !== undefined ? row.current : 'N/A';
                    const prev = row.previous !== undefined ? row.previous : 'N/A';
                    const diff = row.delta ?? 0;
                    const pct = row.percentage_change ?? 0;
                    const isPositiveDiff = diff > 0;
                    const isFavorable = m.isGoodHigh ? isPositiveDiff : !isPositiveDiff;
                    const why = row.why_changed || (diff === 0 ? 'Metric remained stable between evaluated windows.' : `${m.label} shifted by ${diff > 0 ? `+${diff}` : diff}${m.unit}.`);

                    return (
                      <tr key={m.key} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{m.label}</span>
                            <ConfidenceBadge confidence={m.confidence || 'measured'} size="sm" showLabel={false} />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">{prev}{m.unit}</td>
                        <td className="py-3 px-4 font-black text-slate-900 dark:text-white whitespace-nowrap">{cur}{m.unit}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={diff === 0 ? 'text-slate-500 font-bold' : (isFavorable ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold')}>
                            {diff > 0 ? `+${diff}` : diff}{m.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold whitespace-nowrap">
                          {pct !== 0 ? `${pct > 0 ? `+${pct}` : pct}%` : '0%'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            diff === 0
                              ? 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10'
                              : isFavorable
                              ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                              : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
                          }`}>
                            {diff === 0 ? 'Stable' : (isFavorable ? 'Improved' : 'Declined')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-sans max-w-md">
                          {why}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Topic-by-Topic Variance & Causal Evolution */}
          {(topicEvol.topic_comparison_details || []).length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.4 }}
              className="p-6 rounded-2xl glass-card space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                <div>
                  <h3 className="font-display font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Topic & Complaint Category Variance Shifts</span>
                  </h3>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Granular volume shifts and negative sentiment delta across specific failure modes
                  </p>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold">
                  {topicEvol.topic_comparison_details.length} Topics Analyzed
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4 font-bold">Failure Category</th>
                      <th className="py-3 px-4 font-bold">Baseline Vol</th>
                      <th className="py-3 px-4 font-bold">Target Vol</th>
                      <th className="py-3 px-4 font-bold">Volume Shift</th>
                      <th className="py-3 px-4 font-bold">Dissatisfaction Shift</th>
                      <th className="py-3 px-4 font-bold">Root Cause Analysis & Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {topicEvol.topic_comparison_details.map((t, idx) => {
                      const cleanName = getCleanClusterName(t.cluster_name || t.topic_keywords || '');
                      const prevVol = t.previous_volume ?? t.vol_prev ?? t.prev_volume;
                      const curVol = t.current_volume ?? t.vol_cur ?? t.cur_volume;
                      const volDelta = t.volume_delta ?? t.delta ?? ((curVol !== undefined && prevVol !== undefined) ? curVol - prevVol : 0);
                      const isSurging = volDelta > 0;
                      const negDelta = t.neg_tone_delta ?? (t.current_neg_tone !== undefined && t.previous_neg_tone !== undefined ? Number((t.current_neg_tone - t.previous_neg_tone).toFixed(1)) : null);
                      const hasNegData = negDelta !== undefined && negDelta !== null;
                      const uniqueKey = `${t.topic_keywords || t.cluster_name || 'topic'}-${idx}`;
                      const analysisText = t.why_changed || t.summary || (volDelta > 0 
                        ? `Inquiry volume surged by +${Math.abs(volDelta).toLocaleString()} cases, indicating expanding support friction.` 
                        : (volDelta < 0 ? `Inquiry volume contracted by ${Math.abs(volDelta).toLocaleString()} cases, reflecting improved issue resolution.` : 'Inquiry volume remained steady across both periods.'));

                      return (
                        <tr key={uniqueKey} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white capitalize whitespace-nowrap">{cleanName}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {prevVol !== undefined && prevVol !== null ? prevVol.toLocaleString() : '—'}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {curVol !== undefined && curVol !== null ? curVol.toLocaleString() : '—'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={volDelta === 0 ? 'text-slate-500 font-bold' : (isSurging ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold')}>
                              {volDelta > 0 ? `+${volDelta.toLocaleString()}` : (volDelta < 0 ? volDelta.toLocaleString() : '0')}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {hasNegData ? (
                              <span className={negDelta === 0 ? 'text-slate-500' : (negDelta > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold')}>
                                {negDelta > 0 ? `+${negDelta}%` : `${negDelta}%`}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-sans max-w-sm">
                            {analysisText}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default ComparePage;
