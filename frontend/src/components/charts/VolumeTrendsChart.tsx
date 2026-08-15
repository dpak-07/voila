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
import { TrendingUp, AlertTriangle, Layers, Calendar, BarChart3 } from 'lucide-react';

export const VolumeTrendsChart: React.FC = () => {
  const { data, filters } = useApp();
  const [chartMode, setChartMode] = useState<'composed' | 'area' | 'bar'>('composed');

  const trendData =
    filters.timePeriod === 'daily'
      ? data?.trends?.daily || []
      : filters.timePeriod === 'monthly'
      ? data?.trends?.monthly || data?.trends?.daily || []
      : data?.trends?.weekly || data?.trends?.daily || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-3.5 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[220px]">
          <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-100 pb-1.5">
            <span className="font-mono">{label}</span>
            {item.is_spike && (
              <span className="flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                <AlertTriangle className="w-3 h-3" /> Z={item.z_score}
              </span>
            )}
          </div>
          <div className="space-y-1 pt-1 text-slate-600">
            <div className="flex justify-between">
              <span className="text-blue-600 font-semibold">Total Volume:</span>
              <span className="font-mono font-bold text-slate-900">{item.total_volume?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-600 font-semibold">Positive Volume:</span>
              <span className="font-mono">{item.positive_volume?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-rose-600 font-semibold">Negative Complaints:</span>
              <span className="font-mono">{item.negative_volume?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-600 font-semibold">Avg Response Latency:</span>
              <span className="font-mono">{item.avg_response_time} min</span>
            </div>
          </div>
          {item.spike_reason && (
            <div className="mt-1.5 pt-1.5 border-t border-rose-200 text-[10px] text-rose-700 leading-tight">
              ⚠️ <strong>Spike Driver:</strong> {item.spike_reason}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="analytics-card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-800">
              Interaction Volume, Sentiment Stream &amp; Anomaly Trends
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-Layer Telemetry: Conversation Streams, Sentiment Polarities &amp; Mean Response Latency
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setChartMode('composed')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
              chartMode === 'composed'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Multi-Layer
          </button>
          <button
            onClick={() => setChartMode('area')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
              chartMode === 'area'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Area Stream
          </button>
          <button
            onClick={() => setChartMode('bar')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
              chartMode === 'bar'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stacked Bars
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 md:h-80 w-full mt-1">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'composed' ? (
            <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#6366f1" tick={{ fill: '#6366f1', fontSize: 11 }} unit="m" />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }}
                formatter={(value) => <span className="text-slate-700 font-semibold">{value}</span>}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="total_volume"
                name="Total Volume"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#volGrad)"
              />
              <Bar yAxisId="left" dataKey="negative_volume" name="Negative Complaints" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avg_response_time"
                name="Mean Latency (min)"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3, fill: '#6366f1' }}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
              <Area type="monotone" dataKey="positive_volume" name="Positive Volume" stroke="#10b981" fill="url(#posGrad)" />
              <Area type="monotone" dataKey="negative_volume" name="Negative Complaints" stroke="#f43f5e" fill="url(#negGrad)" />
            </AreaChart>
          ) : (
            <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
              <Bar dataKey="positive_volume" name="Positive" stackId="a" fill="#10b981" />
              <Bar dataKey="neutral_volume" name="Neutral" stackId="a" fill="#94a3b8" />
              <Bar dataKey="negative_volume" name="Negative" stackId="a" fill="#f43f5e" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
