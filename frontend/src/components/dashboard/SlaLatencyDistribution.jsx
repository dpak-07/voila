import React from 'react';
import { Clock, ShieldCheck, AlertTriangle, Flame, ArrowUpRight } from 'lucide-react';

export function SlaLatencyDistribution({ slaData = [] }) {
  if (!slaData || slaData.length === 0) return null;

  const total = slaData.reduce((acc, item) => acc + (item.count || 0), 0);

  return (
    <div className="p-6 rounded-2xl signal-card space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="font-display font-extrabold text-base text-zinc-900 tracking-tight">
              SLA Response Latency Distribution & Breach Breakdown
            </h3>
          </div>
          <p className="text-xs font-mono text-zinc-500 mt-0.5">
            Turnaround time distribution categorizing conversations against the 15-minute Tier-1 SLA threshold.
          </p>
        </div>
        <span className="text-[11px] font-mono text-zinc-500 font-semibold shrink-0">
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
              className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                isOptimal
                  ? 'bg-emerald-50/40 border-emerald-200/80 shadow-2xs'
                  : isCritical
                  ? 'bg-rose-50/40 border-rose-200/80 shadow-2xs'
                  : isWarning
                  ? 'bg-amber-50/40 border-amber-200/80 shadow-2xs'
                  : 'bg-zinc-50 border-zinc-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-zinc-800">
                  {item.tier}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
              </div>

              <div>
                <div className="flex items-baseline gap-1.5 font-mono">
                  <span className="text-2xl font-black text-zinc-950">
                    {item.percentage}%
                  </span>
                  <span className="text-[11px] text-zinc-500 font-semibold">
                    ({item.count.toLocaleString()} msgs)
                  </span>
                </div>

                {/* Mini Visual Bar */}
                <div className="w-full h-2 bg-zinc-200/70 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(5, item.percentage))}%`,
                      backgroundColor: item.color
                    }}
                  />
                </div>
              </div>

              <div className="pt-1 text-[10px] font-mono text-zinc-500 flex items-center justify-between border-t border-zinc-200/60">
                <span>{isOptimal ? 'SLA Target Met' : isCritical ? 'Severe Violation' : 'Monitoring'}</span>
                <span className="font-bold text-zinc-700">
                  {total > 0 ? `${((item.count / total) * 100).toFixed(1)}% share` : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SlaLatencyDistribution;
