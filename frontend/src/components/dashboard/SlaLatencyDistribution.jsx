import React from 'react';
import { Clock, ShieldCheck, AlertTriangle, Flame, ArrowUpRight } from 'lucide-react';

export function SlaLatencyDistribution({ slaData = [] }) {
  if (!slaData || slaData.length === 0) return null;

  const total = slaData.reduce((acc, item) => acc + (item.count || 0), 0);

  return (
    <div className="p-6 rounded-2xl glass-card space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
              SLA Response Latency Distribution & Breach Breakdown
            </h3>
          </div>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
            Turnaround time distribution categorizing conversations against the 15-minute Tier-1 SLA threshold.
          </p>
        </div>
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold shrink-0">
          Target: &gt;80% in &lt;15m Tier
        </span>
      </div>

      {/* Progress Bars & Metric Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {slaData.map((item, idx) => {
          const isOptimal = item.status === 'optimal';
          const isWarning = item.status === 'warning';
          const isCritical = item.status === 'critical';

          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                isOptimal
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/90 dark:border-emerald-500/30'
                  : isCritical
                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/90 dark:border-rose-500/30'
                  : isWarning
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/90 dark:border-amber-500/30'
                  : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200">
                  {item.tier}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                    {item.percentage}%
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">
                    ({item.count?.toLocaleString()} msgs)
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-white/10">
                <span>{item.description}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SlaLatencyDistribution;
