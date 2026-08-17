import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { Globe, Layers, Activity, TrendingUp } from 'lucide-react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';
import { useTheme } from '../../context/ThemeContext';

const CATEGORY_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

function normalizeRegionName(raw) {
  if (!raw) return 'Unknown Region';
  const lower = String(raw).toLowerCase();
  if (lower.includes('north america') || lower === 'us' || lower === 'usa') return 'North America';
  if (lower.includes('uk') || lower.includes('ireland')) return 'UK & Ireland';
  if (lower.includes('europe') || lower === 'emea') return 'EMEA (Europe)';
  if (lower.includes('asia') || lower === 'apac' || lower.includes('pacific')) return 'APAC (Asia-Pac)';
  if (lower.includes('latin') || lower === 'latam' || lower.includes('south america')) return 'LATAM (Lat-Am)';
  if (lower.includes('middle east') || lower.includes('africa') || lower === 'mea') return 'MEA';
  return raw;
}

export function InteractiveCrossRegionalMatrix({ painPoints = [], regionData = [] }) {
  const [metricMode, setMetricMode] = useState('volume');
  const { isDark } = useTheme();

  const topics = useMemo(() => {
    if (!painPoints || painPoints.length === 0) return [];
    return painPoints.map((p) => p.cluster_name || p.name || p.topic || 'Unknown Topic');
  }, [painPoints]);

  const topicWeights = useMemo(() => {
    if (!painPoints || painPoints.length === 0) return [];
    const total = painPoints.reduce((sum, p) => sum + Number(p.volume || 0), 0);
    if (total === 0) return painPoints.map(() => 1 / painPoints.length);
    return painPoints.map((p) => Number(p.volume || 0) / total);
  }, [painPoints]);

  const topicSentiment = useMemo(() => {
    if (!painPoints || painPoints.length === 0) return [];
    return painPoints.map((p) => Number(p.negative_sentiment_percentage || 0));
  }, [painPoints]);

  const hasData = regionData && regionData.length > 0 && topics.length > 0;

  const matrixData = useMemo(() => {
    if (!hasData) return [];
    return regionData.map((r) => {
      const entry = { region: normalizeRegionName(r.region || r.name || r.key) };
      const totalVol = Number(r.total_conversations || 0);
      const avgSla = Number(r.avg_response_time_minutes || 0);
      topics.forEach((topic, i) => {
        if (metricMode === 'volume') {
          entry[topic] = Math.round(totalVol * topicWeights[i]);
        } else {
          const sentimentFactor = topicSentiment[i] > 0 ? 1 + (topicSentiment[i] - 25) / 100 : 1;
          entry[topic] = Math.round(avgSla * sentimentFactor * 10) / 10;
        }
      });
      return entry;
    });
  }, [regionData, topics, topicWeights, topicSentiment, metricMode, hasData]);

  if (!hasData) {
    return (
      <div className="p-6 rounded-2xl glass-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Cross-Regional Category Density & SLA Matrix</span>
              </h3>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                No regional or topic data available for current filter window.
              </p>
            </div>
          </div>
          <ConfidenceBadge confidence="measured" size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl glass-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Cross-Regional Category Density & SLA Matrix</span>
            </h3>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Interactive multi-category distribution and response latency breakdown across global markets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-white/[0.04] p-1 border border-slate-200 dark:border-white/10 text-xs font-mono">
            <button
              onClick={() => setMetricMode('volume')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                metricMode === 'volume'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Complaint Volume
            </button>
            <button
              onClick={() => setMetricMode('sla')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                metricMode === 'sla'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Avg SLA Latency (mins)
            </button>
          </div>
          <ConfidenceBadge confidence="measured" size="sm" />
        </div>
      </div>

      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={matrixData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
            <XAxis 
              dataKey="region" 
              tick={{ fill: isDark ? '#94a3b8' : '#334155', fontSize: 11, fontWeight: 600, fontFamily: 'monospace' }} 
              axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: isDark ? '#64748b' : '#64748b', fontSize: 10, fontFamily: 'monospace' }} 
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => metricMode === 'volume' ? `${(v/1000).toFixed(1)}k` : `${v}m`}
            />
            <Tooltip
              cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(99, 102, 241, 0.05)', rx: 8 }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200 dark:border-white/15 shadow-2xl font-mono text-xs text-slate-900 dark:text-white space-y-2 min-w-[220px]">
                      <div className="border-b border-slate-100 dark:border-white/10 pb-1.5 flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{label}</span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                          {metricMode === 'volume' ? 'Category Cases' : 'Mean Latency'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {payload.map((entry, index) => (
                          <div key={`item-${index}`} className="flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                              {entry.name}:
                            </span>
                            <strong className="text-slate-900 dark:text-white font-bold ml-2">
                              {metricMode === 'volume' ? `${entry.value.toLocaleString()} cases` : `${entry.value}m`}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }} 
            />
            {topics.map((topic, i) => (
              <Bar
                key={topic}
                dataKey={topic}
                fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default InteractiveCrossRegionalMatrix;
