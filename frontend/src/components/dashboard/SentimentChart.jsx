import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Activity, AlertTriangle, TrendingUp, BarChart2 } from 'lucide-react';
import { EmptyDiagnostic } from '../common/EmptyDiagnostic';
import { useTheme } from '../../context/ThemeContext';

export function SentimentChart({ trendsData = [], spikes = [] }) {
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState('cumulative'); // 'cumulative' | 'interval'
  const isCumulative = viewMode === 'cumulative';

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

  const formattedData = useMemo(() => {
    if (!rawList || rawList.length === 0) return [];

    let cumPos = 0;
    let cumNeu = 0;
    let cumNeg = 0;

    return rawList.map((item, idx) => {
      const p = Number(item.positive || 0);
      const n = Number(item.neutral || 0);
      const neg = Number(item.negative || 0);

      cumPos += p;
      cumNeu += n;
      cumNeg += neg;
      const cumTotal = cumPos + cumNeu + cumNeg;
      const intervalTotal = p + n + neg;

      return {
        day: item.day || item.date || item.period || `Signal #${idx + 1}`,
        positive: isCumulative ? cumPos : p,
        neutral: isCumulative ? cumNeu : n,
        negative: isCumulative ? cumNeg : neg,
        total: isCumulative ? cumTotal : intervalTotal,
        isSpike: spikeList.some((s) => s.day === item.day || s.date === item.day),
      };
    });
  }, [rawList, isCumulative, spikeList]);

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

  const finalTotal = formattedData.length > 0 ? formattedData[formattedData.length - 1].total : 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const pos = payload.find(p => p.dataKey === 'positive')?.value || 0;
      const neu = payload.find(p => p.dataKey === 'neutral')?.value || 0;
      const neg = payload.find(p => p.dataKey === 'negative')?.value || 0;
      const total = pos + neu + neg;
      const posPct = total > 0 ? Math.round((pos / total) * 100) : 0;
      const neuPct = total > 0 ? Math.round((neu / total) * 100) : 0;
      const negPct = total > 0 ? Math.round((neg / total) * 100) : 0;

      return (
        <div className="p-3 rounded-2xl bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-white/15 shadow-2xl font-mono text-xs z-50 text-slate-900 dark:text-white backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-1 mb-2 gap-4">
            <p className="font-bold text-slate-900 dark:text-white">{label}</p>
            <span className="text-[10px] text-slate-400 font-sans uppercase tracking-wider">
              {isCumulative ? 'Cumulative Flow' : 'Period Slice'}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400">
              <span>Positive:</span>
              <span className="font-bold">{pos} {isCumulative && <span className="text-[10px] opacity-75">({posPct}%)</span>}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-500 dark:text-slate-400">
              <span>Neutral:</span>
              <span className="font-bold">{neu} {isCumulative && <span className="text-[10px] opacity-75">({neuPct}%)</span>}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-rose-600 dark:text-rose-400">
              <span>Negative:</span>
              <span className="font-bold">{neg} {isCumulative && <span className="text-[10px] opacity-75">({negPct}%)</span>}</span>
            </div>
            <div className="pt-1 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-4 text-slate-900 dark:text-white font-bold">
              <span>{isCumulative ? 'Cumulative Total:' : 'Period Total:'}</span>
              <span>{total} signals</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 rounded-2xl glass-card flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Sentiment Signal Trajectory
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
              {finalTotal.toLocaleString()} signals
            </span>
          </div>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
            {isCumulative 
              ? 'Continuous cumulative tone accumulation across overall dataset records'
              : 'Voice-of-customer tone distribution over time with verified Z-Score spike detection'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Mode Switcher: Cumulative vs Interval */}
          <div className="inline-flex rounded-xl p-0.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setViewMode('cumulative')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                isCumulative
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>Overall ({finalTotal.toLocaleString()})</span>
            </button>
            <button
              onClick={() => setViewMode('interval')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                !isCumulative
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              <span>By Date</span>
            </button>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-mono font-semibold">
            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            Z &gt; 2.0
          </span>
        </div>
      </div>

      <div className="h-72 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorNeutral" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
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
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorPositive)"
              name="Positive"
              dot={{ r: 3.5, fill: '#10b981', stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 1.5 }}
              activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="neutral"
              stroke="#64748b"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorNeutral)"
              name="Neutral"
              dot={{ r: 3.5, fill: '#64748b', stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 1.5 }}
              activeDot={{ r: 6, fill: '#64748b', stroke: '#ffffff', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="negative"
              stroke="#f43f5e"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorNegative)"
              name="Negative"
              dot={{ r: 3.5, fill: '#f43f5e', stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 1.5 }}
              activeDot={{ r: 6, fill: '#f43f5e', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default SentimentChart;
