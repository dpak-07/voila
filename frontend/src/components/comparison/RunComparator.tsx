import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  GitCompare,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

export const RunComparator: React.FC = () => {
  const { runs } = useApp();
  const [runA, setRunA] = useState(runs[0]?.run_id || 'run-w32-2026');
  const [runB, setRunB] = useState(runs[1]?.run_id || 'run-w31-2026');
  const [comparison, setComparison] = useState<any>({
    status: 'success',
    variances: {
      total_volume: { current: 14850, previous: 14200, delta: 650, delta_pct: 4.58, unit: 'cases' },
      resolution_rate: { current: 89.4, previous: 86.2, delta: 3.2, delta_pct: 3.71, isPositiveGood: true, unit: '%' },
      escalation_rate: { current: 7.8, previous: 9.4, delta: -1.6, delta_pct: -17.02, isPositiveGood: false, unit: '%' },
      reopen_rate: { current: 4.2, previous: 5.8, delta: -1.6, delta_pct: -27.59, isPositiveGood: false, unit: '%' },
      avg_response_time: { current: 18.5, previous: 21.0, delta: -2.5, delta_pct: -11.90, isPositiveGood: false, unit: 'min' },
      negative_sentiment_share: { current: 21.4, previous: 26.2, delta: -4.8, delta_pct: -18.32, isPositiveGood: false, unit: '%' },
      fcr_rate: { current: 74.2, previous: 71.8, delta: 2.4, delta_pct: 3.34, isPositiveGood: true, unit: '%' },
      sla_breach_rate: { current: 3.1, previous: 4.5, delta: -1.4, delta_pct: -31.11, isPositiveGood: false, unit: '%' },
    },
  });

  const handleCompare = async () => {
    try {
      const data = await api.compareDatasetRuns(runA, runB);
      if (data && data.variances) {
        setComparison(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const metricLabels: Record<string, string> = {
    total_volume: 'Total Conversations Volume',
    resolution_rate: 'Resolution Rate (%)',
    escalation_rate: 'Escalation Rate (%)',
    reopen_rate: 'Reopen Rate (%)',
    avg_response_time: 'Mean Response Time',
    negative_sentiment_share: 'Negative Friction Share (%)',
    fcr_rate: 'First Contact Resolution (%)',
    sla_breach_rate: 'SLA Breach Rate (%)',
  };

  return (
    <div className="space-y-6">
      {/* Comparator Control Bar */}
      <div className="pbi-card">
        <div className="pbi-card-header">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Historical Dataset Run Comparator</h3>
              <p className="text-xs text-slate-400">
                Side-by-side metric variance & customer sentiment shift delta
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Active Run (Current Version)
            </label>
            <select
              value={runA}
              onChange={(e) => setRunA(e.target.value)}
              className="w-full bg-surface-100 border border-surface-border rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
            >
              {runs.map((r) => (
                <option key={r.run_id} value={r.run_id}>
                  {r.dataset_name || r.filename || r.run_id} ({r.total_rows?.toLocaleString()} rows)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Baseline Run (Comparison Benchmark)
            </label>
            <select
              value={runB}
              onChange={(e) => setRunB(e.target.value)}
              className="w-full bg-surface-100 border border-surface-border rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
            >
              {runs.map((r) => (
                <option key={r.run_id} value={r.run_id}>
                  {r.dataset_name || r.filename || r.run_id} ({r.total_rows?.toLocaleString()} rows)
                </option>
              ))}
            </select>
          </div>

          <button onClick={handleCompare} className="btn-gradient-primary py-2.5 text-xs">
            <Sparkles className="w-4 h-4" />
            <span>Execute Run Comparison</span>
          </button>
        </div>
      </div>

      {/* Variance Matrix Table */}
      <div className="pbi-card overflow-x-auto">
        <div className="pbi-card-header">
          <h4 className="text-sm font-bold text-white">Delta Variance Performance Matrix</h4>
          <span className="text-xs font-mono text-emerald-400">Pre-computed Delta Signatures</span>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-surface-border text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-surface-100/40">
              <th className="py-3 px-4">Core Operational Metric</th>
              <th className="py-3 px-4">Active Run ({runA.slice(0, 10)})</th>
              <th className="py-3 px-4">Baseline Run ({runB.slice(0, 10)})</th>
              <th className="py-3 px-4">Absolute Delta</th>
              <th className="py-3 px-4">Variance Percentage</th>
              <th className="py-3 px-4 text-right">Trend Assessment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/40 text-xs text-slate-300">
            {Object.entries(comparison.variances || {}).map(([key, val]: [string, any]) => {
              const deltaPct = val.delta_pct || 0;
              const isUp = deltaPct > 0;
              const isDown = deltaPct < 0;
              const isPositiveGood = val.isPositiveGood !== false;
              const isGood = isPositiveGood ? isUp : isDown;

              return (
                <tr key={key} className="hover:bg-surface-100/50 transition">
                  <td className="py-3.5 px-4 font-bold text-white">
                    {metricLabels[key] || key}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">
                    {typeof val.current === 'number' ? val.current.toLocaleString() : val.current} {val.unit}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    {typeof val.previous === 'number' ? val.previous.toLocaleString() : val.previous} {val.unit}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold">
                    {val.delta > 0 ? `+${val.delta}` : val.delta} {val.unit}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-xs ${
                        isGood
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {isUp && <ArrowUpRight className="w-3.5 h-3.5" />}
                      {isDown && <ArrowDownRight className="w-3.5 h-3.5" />}
                      {deltaPct > 0 ? `+${deltaPct.toFixed(1)}%` : `${deltaPct.toFixed(1)}%`}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`text-xs font-semibold ${
                        isGood ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isGood ? 'Favorable Progress' : 'Requires Attention'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
