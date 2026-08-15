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
  Database,
  ArrowRight,
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
    resolution_rate: 'Resolution Efficiency Rate (%)',
    escalation_rate: 'Ticket Escalation Rate (%)',
    reopen_rate: 'Repeat Reopen Rate (%)',
    avg_response_time: 'Mean Response SLA Latency',
    negative_sentiment_share: 'Negative Friction Share (%)',
    fcr_rate: 'First Contact Resolution (FCR) (%)',
    sla_breach_rate: 'SLA Breach Rate (%)',
  };

  return (
    <div className="space-y-6">
      {/* Comparator Controls */}
      <div className="executive-card space-y-4">
        <div className="executive-card-header">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs md:text-sm font-bold text-white">Historical Dataset Run Shift Comparator</h3>
              <p className="text-[11px] text-slate-400">
                Side-by-side metric variance &amp; customer sentiment drift analysis
              </p>
            </div>
          </div>
          <span className="badge-indigo">Variance Engine Active</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-1">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 font-mono">
              Active Run (Current Target)
            </label>
            <select
              value={runA}
              onChange={(e) => setRunA(e.target.value)}
              className="w-full bg-surface-100/90 border border-surface-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary-500 font-mono shadow-inner"
            >
              {runs.map((r) => (
                <option key={r.run_id} value={r.run_id}>
                  {r.dataset_name || r.filename || r.run_id} ({r.total_rows?.toLocaleString()} rows)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 font-mono">
              Baseline Run (Comparison Benchmark)
            </label>
            <select
              value={runB}
              onChange={(e) => setRunB(e.target.value)}
              className="w-full bg-surface-100/90 border border-surface-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary-500 font-mono shadow-inner"
            >
              {runs.map((r) => (
                <option key={r.run_id} value={r.run_id}>
                  {r.dataset_name || r.filename || r.run_id} ({r.total_rows?.toLocaleString()} rows)
                </option>
              ))}
            </select>
          </div>

          <button onClick={handleCompare} className="btn-gradient-primary py-2.5 text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Execute Drift Comparison</span>
          </button>
        </div>
      </div>

      {/* Variance Matrix Table */}
      <div className="data-table-container">
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <h4 className="text-xs md:text-sm font-bold text-white">Delta Variance Performance Matrix</h4>
          <span className="text-[11px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            Pre-Calculated Signatures
          </span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Core Operational Metric</th>
              <th>Active Target ({runA.slice(0, 10)})</th>
              <th>Baseline Benchmark ({runB.slice(0, 10)})</th>
              <th>Absolute Delta</th>
              <th>Variance Shift (%)</th>
              <th className="text-right">Performance Assessment</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(comparison.variances || {}).map(([key, val]: [string, any]) => {
              const deltaPct = val.delta_pct || 0;
              const isUp = deltaPct > 0;
              const isDown = deltaPct < 0;
              const isPositiveGood = val.isPositiveGood !== false;
              const isGood = isPositiveGood ? isUp : isDown;

              return (
                <tr key={key}>
                  <td className="font-bold text-white">
                    {metricLabels[key] || key}
                  </td>
                  <td className="font-mono font-bold text-cyan-300">
                    {typeof val.current === 'number' ? val.current.toLocaleString() : val.current} {val.unit}
                  </td>
                  <td className="font-mono text-slate-400">
                    {typeof val.previous === 'number' ? val.previous.toLocaleString() : val.previous} {val.unit}
                  </td>
                  <td className="font-mono font-semibold text-slate-200">
                    {val.delta > 0 ? `+${val.delta}` : val.delta} {val.unit}
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-md text-xs ${
                        isGood
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                      }`}
                    >
                      {isUp && <ArrowUpRight className="w-3.5 h-3.5" />}
                      {isDown && <ArrowDownRight className="w-3.5 h-3.5" />}
                      {deltaPct > 0 ? `+${deltaPct.toFixed(1)}%` : `${deltaPct.toFixed(1)}%`}
                    </span>
                  </td>
                  <td className="text-right">
                    <span
                      className={`text-xs font-semibold ${
                        isGood ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isGood ? 'Favorable Gain' : 'Requires Investigation'}
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
