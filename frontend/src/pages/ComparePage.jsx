import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Zap,
  Activity
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
  ReferenceLine 
} from 'recharts';
import { analyticsApi } from '../api/analytics';
import { useRun } from '../context/RunContext';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ConfidenceBadge } from '../components/common/ConfidenceBadge';

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
  const { runs, activeRunId, dateRangeInfo } = useRun();
  const [compareMode, setCompareMode] = useState('runs'); // 'runs' | 'years'
  const [currentRunId, setCurrentRunId] = useState(activeRunId === 'all' ? (runs[0]?.run_id || '') : activeRunId);
  const [previousRunId, setPreviousRunId] = useState(runs[1]?.run_id || runs[0]?.run_id || '');
  
  const years = dateRangeInfo?.available_years?.length > 0 ? dateRangeInfo.available_years : [2023, 2024, 2025];
  const [yearA, setYearA] = useState(years[0] || 2023);
  const [yearB, setYearB] = useState(years[years.length - 1] || 2024);

  const { data: compareData, isLoading, refetch } = useQuery({
    queryKey: ['compare_page', compareMode, currentRunId, previousRunId, yearA, yearB],
    queryFn: () => {
      if (compareMode === 'years') {
        return analyticsApi.compareRuns({ year_a: yearA, year_b: yearB });
      }
      return analyticsApi.compareRuns({ current_run_id: currentRunId, previous_run_id: previousRunId });
    },
    enabled: Boolean((compareMode === 'runs' && (currentRunId || runs.length > 0)) || (compareMode === 'years' && yearA && yearB)),
    refetchInterval: 30000,
  });

  const delta = compareData?.comparison_summary || {};
  const topicEvol = compareData?.topic_evolution || {};
  const comparisonLabel = compareData?.comparison_label || 'Dataset Comparison';

  const metricsList = [
    { key: 'resolution_rate', label: 'Resolution Rate', unit: '%', isGoodHigh: true },
    { key: 'avg_response_time_minutes', label: 'Avg Response Time', unit: 'm', isGoodHigh: false },
    { key: 'reopen_rate', label: 'Reopen Rate', unit: '%', isGoodHigh: false },
    { key: 'escalation_rate', label: 'Escalation Rate', unit: '%', isGoodHigh: false },
    { key: 'negative_sentiment_percentage', label: 'Negative Tone Share', unit: '%', isGoodHigh: false },
    { key: 'positive_sentiment_percentage', label: 'Positive Tone Share', unit: '%', isGoodHigh: true },
  ];

  // Prepare chart data for variance visualization
  const chartData = metricsList.map((m) => {
    const row = delta[m.key] || {};
    const pct = Number(row.percentage_change ?? 0);
    const diff = Number(row.delta ?? 0);
    const isPositiveDiff = diff > 0;
    const isFavorable = m.isGoodHigh ? isPositiveDiff : !isPositiveDiff;
    return {
      metric: m.label,
      pctVariance: pct,
      isFavorable,
      diff,
      unit: m.unit
    };
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 text-white shadow-md shadow-rose-200">
            <GitCompare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              Dataset Delta & Multi-Year Variance
            </h1>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              Inspect statistical drift, KPI variances, and topic shifts between dataset uploads or calendar years.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 font-mono text-xs shadow-2xs">
          <button
            onClick={() => setCompareMode('runs')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              compareMode === 'runs'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upload vs. Upload
          </button>
          <button
            onClick={() => setCompareMode('years')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              compareMode === 'years'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Year vs. Year
          </button>
        </div>
      </div>

      {/* Selectors Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h3 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>{compareMode === 'runs' ? 'Select Dataset Upload Runs to Compare' : 'Select Calendar Years to Compare'}</span>
          </h3>
          <span className="text-xs font-mono text-slate-500">
            Comparing T1 (Target) against T0 (Baseline)
          </span>
        </div>

        {compareMode === 'runs' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <label className="block text-slate-700 mb-1.5 font-bold">
                Target Period (T1) — Newer Window
              </label>
              <select
                value={currentRunId}
                onChange={(e) => setCurrentRunId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-medium outline-none focus:border-indigo-600 focus:bg-white transition-all cursor-pointer shadow-2xs"
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
              <label className="block text-slate-700 mb-1.5 font-bold">
                Baseline Period (T0) — Historical Window
              </label>
              <select
                value={previousRunId}
                onChange={(e) => setPreviousRunId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-medium outline-none focus:border-indigo-600 focus:bg-white transition-all cursor-pointer shadow-2xs"
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
              <label className="block text-slate-700 mb-1.5 font-bold">
                Target Comparison Year (T1)
              </label>
              <select
                value={yearB}
                onChange={(e) => setYearB(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-medium outline-none focus:border-indigo-600 focus:bg-white transition-all cursor-pointer shadow-2xs"
              >
                {years.map((yr) => (
                  <option key={yr} value={yr}>Year {yr}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 mb-1.5 font-bold">
                Baseline Comparison Year (T0)
              </label>
              <select
                value={yearA}
                onChange={(e) => setYearA(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-medium outline-none focus:border-indigo-600 focus:bg-white transition-all cursor-pointer shadow-2xs"
              >
                {years.map((yr) => (
                  <option key={yr} value={yr}>Year {yr}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {isLoading ? (
        <LoadingSkeleton rows={4} height="h-28" />
      ) : (
        <div className="space-y-6">
          {/* Visual Delta Variance Chart */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-display font-black text-base text-slate-900 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-indigo-600" />
                  <span>Metric Variance Waterfall (% Shift T1 vs. T0)</span>
                </h3>
                <p className="text-xs font-mono text-slate-500">
                  Green indicates operational improvement; Red indicates operational friction increase
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-xs font-bold">
                {comparisonLabel}
              </span>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="metric" 
                    tick={{ fill: '#334155', fontSize: 11, fontWeight: 600, fontFamily: 'monospace' }} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: '#ffffff',
                    }}
                    formatter={(val, name, item) => [
                      `${val > 0 ? `+${val}` : val}% (${item.payload.diff > 0 ? `+${item.payload.diff}` : item.payload.diff}${item.payload.unit})`,
                      item.payload.isFavorable ? 'Improved' : 'Declined'
                    ]}
                  />
                  <ReferenceLine y={0} stroke="#94a3b8" />
                  <Bar dataKey="pctVariance" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.pctVariance === 0 ? '#94a3b8' : (entry.isFavorable ? '#10b981' : '#ef4444')} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparison Matrix Table */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-display font-black text-base text-slate-900 flex items-center gap-2">
                <span>Side-by-Side Metric Variance Matrix</span>
                <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-bold">
                  {comparisonLabel}
                </span>
              </h3>
              <ConfidenceBadge confidence="measured" size="sm" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-700 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 font-bold">Metric Evaluated</th>
                    <th className="py-3 px-4 font-bold">Baseline (T0)</th>
                    <th className="py-3 px-4 font-bold">Target (T1)</th>
                    <th className="py-3 px-4 font-bold">Absolute Delta</th>
                    <th className="py-3 px-4 font-bold">% Variance</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold">Causal Diagnostic Analysis (Why It Changed)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metricsList.map((m) => {
                    const row = delta[m.key] || {};
                    const cur = row.current !== undefined ? row.current : 'N/A';
                    const prev = row.previous !== undefined ? row.previous : 'N/A';
                    const diff = row.delta ?? 0;
                    const pct = row.percentage_change ?? 0;
                    const isPositiveDiff = diff > 0;
                    const isFavorable = m.isGoodHigh ? isPositiveDiff : !isPositiveDiff;
                    const why = row.why_changed || (diff === 0 ? 'Metric remained stable between evaluated windows.' : `${m.label} shifted by ${diff > 0 ? `+${diff}` : diff}${m.unit}.`);

                    return (
                      <tr key={m.key} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">{m.label}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{prev}{m.unit}</td>
                        <td className="py-3 px-4 font-black text-slate-900 whitespace-nowrap">{cur}{m.unit}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={diff === 0 ? 'text-slate-500 font-bold' : (isFavorable ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold')}>
                            {diff > 0 ? `+${diff}` : diff}{m.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-semibold whitespace-nowrap">
                          {pct !== 0 ? `${pct > 0 ? `+${pct}` : pct}%` : '0%'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            diff === 0
                              ? 'bg-slate-100 text-slate-700 border-slate-300'
                              : isFavorable
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300'
                          }`}>
                            {diff === 0 ? 'Stable' : (isFavorable ? 'Improved' : 'Declined')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-600 leading-relaxed font-sans max-w-md">
                          {why}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Topic-by-Topic Variance & Causal Evolution */}
          {(topicEvol.topic_comparison_details || []).length > 0 && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-display font-black text-base text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Topic & Complaint Category Variance Shifts</span>
                  </h3>
                  <p className="text-xs font-mono text-slate-500">
                    Granular volume shifts and negative sentiment delta across specific failure modes
                  </p>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold">
                  {topicEvol.topic_comparison_details.length} Topics Analyzed
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-700 text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4 font-bold">Failure Category</th>
                      <th className="py-3 px-4 font-bold">Baseline Vol</th>
                      <th className="py-3 px-4 font-bold">Target Vol</th>
                      <th className="py-3 px-4 font-bold">Volume Shift</th>
                      <th className="py-3 px-4 font-bold">Dissatisfaction Shift</th>
                      <th className="py-3 px-4 font-bold">Root Cause Analysis & Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topicEvol.topic_comparison_details.map((t, idx) => {
                      const cleanName = getCleanClusterName(t.cluster_name || t.topic_keywords || '');
                      const isSurging = t.volume_delta > 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">{cleanName}</td>
                          <td className="py-3 px-4 text-slate-600">{t.previous_volume?.toLocaleString() || 0}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{t.current_volume?.toLocaleString() || 0}</td>
                          <td className="py-3 px-4">
                            <span className={`font-bold ${isSurging ? 'text-rose-700' : (t.volume_delta < 0 ? 'text-emerald-700' : 'text-slate-600')}`}>
                              {t.volume_delta > 0 ? `+${t.volume_delta.toLocaleString()}` : t.volume_delta.toLocaleString()} ({t.volume_pct_change > 0 ? `+${t.volume_pct_change}%` : `${t.volume_pct_change}%`})
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`font-semibold ${t.neg_tone_delta > 0 ? 'text-rose-700' : (t.neg_tone_delta < 0 ? 'text-emerald-700' : 'text-slate-600')}`}>
                              {t.neg_tone_delta > 0 ? `+${t.neg_tone_delta}%` : `${t.neg_tone_delta}%`}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-600 leading-relaxed font-sans max-w-md">
                            {t.why_changed}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Topic Evolution Matrix: New Emerging vs Resolved */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-rose-200/80 shadow-sm space-y-3">
              <h3 className="font-display font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="p-1 rounded-lg bg-rose-100 text-rose-700">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <span>Newly Emerged Complaint Themes</span>
              </h3>
              {(topicEvol.new_emerging_topics || []).length === 0 ? (
                <div className="py-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs font-mono text-slate-500">
                  No new complaint categories emerged between these two periods.
                </div>
              ) : (
                <div className="space-y-2 font-mono text-xs">
                  {(topicEvol.new_emerging_topics || []).map((t, idx) => {
                    const cleanName = getCleanClusterName(t.cluster_name || t.topic_keywords || '');
                    return (
                      <div key={idx} className="p-3 rounded-xl bg-rose-50/50 border border-rose-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                          <span className="text-slate-900 capitalize font-bold">
                            {cleanName}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-rose-700 bg-white px-2 py-0.5 rounded-full border border-rose-200">
                          {t.current_volume ? `${t.current_volume.toLocaleString()} msgs` : 'Active'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 rounded-2xl bg-white border border-emerald-200/80 shadow-sm space-y-3">
              <h3 className="font-display font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="p-1 rounded-lg bg-emerald-100 text-emerald-700">
                  <CheckCircle className="w-4 h-4" />
                </span>
                <span>Subsiding / Resolved Topics</span>
              </h3>
              {(topicEvol.resolved_or_subsided_topics || []).length === 0 ? (
                <div className="py-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs font-mono text-slate-500">
                  No themes dropped below detection threshold.
                </div>
              ) : (
                <div className="space-y-2 font-mono text-xs">
                  {(topicEvol.resolved_or_subsided_topics || []).map((t, idx) => {
                    const cleanName = getCleanClusterName(t.cluster_name || t.topic_keywords || '');
                    return (
                      <div key={idx} className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                          <span className="text-slate-900 capitalize font-bold">
                            {cleanName}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                          {t.previous_volume ? `Was ${t.previous_volume.toLocaleString()} msgs` : 'Subsided'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComparePage;
