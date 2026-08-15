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

export function SentimentChart({ trendsData = [], spikes = [] }) {
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
      <div className="p-6 rounded-2xl signal-card">
        <h3 className="font-display font-bold text-base text-zinc-900 mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-zinc-700" />
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
        <div className="p-3 rounded-xl bg-white border border-zinc-200 shadow-xl font-mono text-xs z-50 text-zinc-900">
          <p className="font-bold text-zinc-900 mb-2 border-b border-zinc-200 pb-1">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-zinc-900">
              <span>Positive:</span>
              <span className="font-bold">{payload.find(p => p.dataKey === 'positive')?.value || 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-zinc-600">
              <span>Neutral:</span>
              <span className="font-bold">{payload.find(p => p.dataKey === 'neutral')?.value || 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-rose-600">
              <span>Negative:</span>
              <span className="font-bold">{payload.find(p => p.dataKey === 'negative')?.value || 0}</span>
            </div>
            <div className="pt-1 border-t border-zinc-200 flex items-center justify-between gap-4 text-zinc-900 font-bold">
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
    <div className="p-6 rounded-2xl signal-card flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-base text-zinc-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-700" />
            Sentiment Signal Trajectory
          </h3>
          <p className="text-xs font-mono text-zinc-500 mt-0.5">
            Voice-of-customer tone distribution over time with verified Z-Score spike detection
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-800 text-[11px] font-mono font-semibold">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Spike Threshold: Z &gt; 2.0
          </span>
        </div>
      </div>

      <div className="h-72 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#09090b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#09090b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorNeutral" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#71717a" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#71717a" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e11d48" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e4e4e7' }}
              tickFormatter={(str) => (str ? (str.length > 4 ? (str.includes('-') ? str.slice(5) : str) : str) : '')}
            />
            <YAxis
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e4e4e7' }}
              tickCount={5}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="positive"
              stroke="#09090b"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorPositive)"
              name="Positive"
            />
            <Area
              type="monotone"
              dataKey="neutral"
              stroke="#71717a"
              strokeWidth={1}
              fillOpacity={1}
              fill="url(#colorNeutral)"
              name="Neutral"
            />
            <Area
              type="monotone"
              dataKey="negative"
              stroke="#e11d48"
              strokeWidth={1.5}
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
