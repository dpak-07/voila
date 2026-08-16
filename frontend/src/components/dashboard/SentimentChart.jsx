import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Activity, AlertTriangle } from 'lucide-react';
import { EmptyDiagnostic } from '../common/EmptyDiagnostic';
import { useTheme } from '../../context/ThemeContext';

export function SentimentChart({ trendsData = [], spikes = [] }) {
  const { isDark } = useTheme();
  let rawList = [];
  if (Array.isArray(trendsData)) {
    rawList = trendsData;
  } else if (Array.isArray(trendsData?.sentiment_trend)) {
    rawList = trendsData.sentiment_trend;
  } else if (Array.isArray(trendsData?.trends?.sentiment_trend)) {
    rawList = trendsData.trends.sentiment_trend;
  } else if (Array.isArray(trendsData?.trends)) {
    rawList = trendsData.trends;
  } else if (trendsData?.trends && typeof trendsData.trends === 'object') {
    rawList = Object.entries(trendsData.trends).map(([dayKey, dayData]) => ({
      day: dayKey,
      positive: dayData?.sentiment_distribution?.positive?.count ?? dayData?.positive ?? 0,
      neutral: dayData?.sentiment_distribution?.neutral?.count ?? dayData?.neutral ?? 0,
      negative: dayData?.sentiment_distribution?.negative?.count ?? dayData?.negative ?? 0,
      total: dayData?.total_records ?? dayData?.total ?? 0,
    }));
  }

  const spikeList = Array.isArray(spikes) ? spikes : [];

  if (!rawList || rawList.length === 0) {
    return (
      <div className="p-6 rounded-2xl glass-card">
        <h3 className="font-display font-bold text-base text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Sentiment Signal Trajectory
        </h3>
        <EmptyDiagnostic
          title="No Time-Series Records Available"
          message="The active dataset does not contain timestamped records to render daily sentiment trajectory."
          requiredFields={["created_at", "sentiment"]}
          compact={true}
        />
      </div>
    );
  }

  // Format data for chart
  const formattedData = rawList.map((item) => ({
    day: item.day || item.date || item.period,
    positive: Number(item.positive || 0),
    neutral: Number(item.neutral || 0),
    negative: Number(item.negative || 0),
    total: Number(item.total || 0),
    isSpike: spikeList.some((s) => s.day === item.day || s.date === item.day),
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, entry) => sum + entry.value, 0);
      return (
        <div className="p-3 rounded-2xl bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-white/15 shadow-2xl font-mono text-xs z-50 text-slate-900 dark:text-white backdrop-blur-xl">
          <p className="font-bold text-slate-900 dark:text-white mb-2 border-b border-slate-100 dark:border-white/10 pb-1">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400">
              <span>Positive:</span>
              <span className="font-bold">{payload.find(p => p.dataKey === 'positive')?.value || 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-500 dark:text-slate-400">
              <span>Neutral:</span>
              <span className="font-bold">{payload.find(p => p.dataKey === 'neutral')?.value || 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-rose-600 dark:text-rose-400">
              <span>Negative:</span>
              <span className="font-bold">{payload.find(p => p.dataKey === 'negative')?.value || 0}</span>
            </div>
            <div className="pt-1 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-4 text-slate-900 dark:text-white font-bold">
              <span>Total Volume:</span>
              <span>{total}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 rounded-2xl glass-card flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Sentiment Signal Trajectory
          </h3>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
            Voice-of-customer tone distribution over time with verified Z-Score spike detection
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-mono font-semibold">
            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            Spike Threshold: Z &gt; 2.0
          </span>
        </div>
      </div>

      <div className="h-72 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorNeutral" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} vertical={false} />
            <XAxis
              dataKey="day"
              stroke={isDark ? '#94a3b8' : '#64748b'}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
              tickFormatter={(str) => (str ? (str.length > 4 ? (str.includes('-') ? str.slice(5) : str) : str) : '')}
            />
            <YAxis
              stroke={isDark ? '#94a3b8' : '#64748b'}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
              tickCount={5}
            />
            <Tooltip 
              cursor={{ stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '4 4' }}
              content={<CustomTooltip />} 
            />
            <Area
              type="monotone"
              dataKey="positive"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPositive)"
              name="Positive"
            />
            <Area
              type="monotone"
              dataKey="neutral"
              stroke="#64748b"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorNeutral)"
              name="Neutral"
            />
            <Area
              type="monotone"
              dataKey="negative"
              stroke="#f43f5e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorNegative)"
              name="Negative"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default SentimentChart;
