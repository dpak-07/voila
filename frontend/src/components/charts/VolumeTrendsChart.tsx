import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from 'recharts';
import { TrendingUp, AlertTriangle, Layers, Calendar } from 'lucide-react';

export const VolumeTrendsChart: React.FC = () => {
  const { data, filters, setCadence } = useApp();
  const [chartMode, setChartMode] = useState<'area' | 'composed' | 'bar'>('composed');

  const trendData =
    filters.timePeriod === 'daily'
      ? data?.trends?.daily || []
      : filters.timePeriod === 'monthly'
      ? data?.trends?.monthly || []
      : data?.trends?.weekly || data?.trends?.daily || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-surface-card/95 backdrop-blur-xl border border-surface-border p-3.5 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[200px]">
          <div className="flex items-center justify-between font-bold text-white border-b border-surface-border/50 pb-1">
            <span>{label}</span>
            {item.is_spike && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-3 h-3" /> Z-Score: {item.z_score}
              </span>
            )}
          </div>
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-slate-300">
              <span className="text-indigo-400 font-semibold">Total Conversations:</span>
              <span className="font-mono font-bold text-white">{item.total_volume?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-emerald-400 font-semibold">Positive Sentiment:</span>
              <span className="font-mono">{item.positive_volume?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-rose-400 font-semibold">Negative Friction:</span>
              <span className="font-mono">{item.negative_volume?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-cyan-400 font-semibold">Avg Response Time:</span>
              <span className="font-mono">{item.avg_response_time} min</span>
            </div>
          </div>
          {item.spike_reason && (
            <div className="mt-1 pt-1 border-t border-rose-500/30 text-[11px] text-rose-300 leading-tight">
              ⚠️ <strong>Spike Driver:</strong> {item.spike_reason}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pbi-card">
      <div className="pbi-card-header">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-white">
              Interaction Volume & Anomaly Spike Trends
            </h3>
            <p className="text-xs text-slate-400">
              Synchronized Multi-Series: Volume Streams, Sentiment Polarity & Response Latency
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 bg-surface-100 p-1 rounded-lg border border-surface-border">
          <button
            onClick={() => setChartMode('composed')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
              chartMode === 'composed' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Multi-Layer
          </button>
          <button
            onClick={() => setChartMode('area')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
              chartMode === 'area' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Area Stream
          </button>
          <button
            onClick={() => setChartMode('bar')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
              chartMode === 'bar' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Stacked Bars
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 md:h-80 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'composed' ? (
            <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis yAxisId="left" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" tick={{ fill: '#06b6d4', fontSize: 11 }} unit="m" />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                formatter={(value) => <span className="text-slate-300 font-medium">{value}</span>}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="total_volume"
                name="Total Volume"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#volGrad)"
              />
              <Bar yAxisId="left" dataKey="negative_volume" name="Negative Friction" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avg_response_time"
                name="Avg Response Time (min)"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ r: 4, fill: '#06b6d4' }}
              />
            </ComposedChart>
          ) : chartMode === 'area' ? (
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="positive_volume" name="Positive Volume" stroke="#10b981" fill="url(#posGrad)" />
              <Area type="monotone" dataKey="negative_volume" name="Negative Complaints" stroke="#f43f5e" fill="url(#negGrad)" />
            </AreaChart>
          ) : (
            <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
              <Bar dataKey="positive_volume" name="Positive" stackId="a" fill="#10b981" />
              <Bar dataKey="neutral_volume" name="Neutral" stackId="a" fill="#64748b" />
              <Bar dataKey="negative_volume" name="Negative" stackId="a" fill="#f43f5e" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
