import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Globe, ArrowUpRight, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

const REGION_COLORS = [
  '#6366f1', // Indigo (US-East)
  '#8b5cf6', // Violet (US-West)
  '#06b6d4', // Cyan (EMEA-UK)
  '#0284c7', // Sky (EMEA-Germany)
  '#10b981', // Emerald (APAC-India)
  '#14b8a6', // Teal (APAC-Singapore)
  '#f59e0b', // Amber (LATAM-Brazil)
];

export function RegionalFrictionChart({ regionData = [] }) {
  if (!regionData || regionData.length === 0) {
    return (
      <div className="p-6 rounded-2xl signal-card space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-zinc-900" />
          <h3 className="font-display font-extrabold text-base text-zinc-900">
            Global Geographic Friction & Latency
          </h3>
        </div>
        <p className="text-xs font-mono text-zinc-500">
          No regional breakdown data available for current filter window.
        </p>
      </div>
    );
  }

  const chartData = regionData.map((r, i) => ({
    name: r.region || `Region #${i + 1}`,
    volume: Number(r.total_conversations || 0),
    negRate: Number(r.negative_sentiment_percentage || 0),
    latency: Number(r.avg_response_time_minutes || 0),
    resRate: Number(r.resolution_rate || 0),
    color: REGION_COLORS[i % REGION_COLORS.length]
  }));

  return (
    <div className="p-6 rounded-2xl signal-card space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">
              <Globe className="w-4 h-4" />
            </div>
            <h3 className="font-display font-extrabold text-base text-zinc-900 tracking-tight">
              Global Geographic Friction & Regional SLA
            </h3>
          </div>
          <p className="text-xs font-mono text-zinc-500 mt-0.5">
            Regional conversation volume, mean response latency, and negative sentiment share across {chartData.length} global markets.
          </p>
        </div>
        <span className="text-[11px] font-mono text-zinc-500 font-semibold shrink-0">
          Total Regional Volume: {chartData.reduce((acc, c) => acc + c.volume, 0).toLocaleString()} msgs
        </span>
      </div>

      {/* Grid: Bar Chart + Regional KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Recharts Bar */}
        <div className="lg:col-span-7 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <XAxis
                dataKey="name"
                stroke="#71717a"
                fontSize={11}
                tickLine={false}
                angle={-15}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <Tooltip
                cursor={{ fill: 'rgba(99, 102, 241, 0.06)', rx: 8 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="p-3.5 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl font-mono text-xs text-slate-900 space-y-1.5 min-w-[200px]">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                            {d.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">Global Market</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Volume:</span>
                          <strong className="text-slate-900">{d.volume.toLocaleString()} msgs</strong>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Negative Tone:</span>
                          <strong className="text-rose-600 font-bold">{d.negRate}%</strong>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Mean SLA:</span>
                          <strong className="text-indigo-600 font-bold">{d.latency}m</strong>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Resolution Rate:</span>
                          <strong className="text-emerald-600 font-bold">{d.resRate}%</strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="volume" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Regional Pills & Metric Highlights */}
        <div className="lg:col-span-5 space-y-2.5 font-mono text-xs">
          {chartData.slice(0, 5).map((reg, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 hover:border-zinc-300 transition-all flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: reg.color }}
                />
                <span className="font-bold text-zinc-900">{reg.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-zinc-200/80 text-zinc-800 text-[10px] font-bold">
                  {reg.volume.toLocaleString()} msgs
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    reg.negRate > 30 ? 'bg-rose-100 text-rose-700' : 'bg-zinc-100 text-zinc-700'
                  }`}
                >
                  {reg.negRate}% Neg
                </span>
                <span className="text-[10px] text-zinc-500">
                  {reg.latency}m
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RegionalFrictionChart;
