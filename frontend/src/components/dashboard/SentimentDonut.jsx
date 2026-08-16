import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { EmptyDiagnostic } from '../common/EmptyDiagnostic';

export function SentimentDonut({ distribution = {}, totalRecords = 0 }) {
  const posCount = distribution.positive?.count || 0;
  const neuCount = distribution.neutral?.count || 0;
  const negCount = distribution.negative?.count || 0;

  const posPct = distribution.positive?.percentage ?? (totalRecords ? (posCount / totalRecords * 100).toFixed(1) : 0);
  const neuPct = distribution.neutral?.percentage ?? (totalRecords ? (neuCount / totalRecords * 100).toFixed(1) : 0);
  const negPct = distribution.negative?.percentage ?? (totalRecords ? (negCount / totalRecords * 100).toFixed(1) : 0);

  const data = [
    { name: 'Positive', value: posCount, percentage: posPct, color: '#10b981' },
    { name: 'Neutral', value: neuCount, percentage: neuPct, color: '#64748b' },
    { name: 'Negative', value: negCount, percentage: negPct, color: '#f43f5e' },
  ].filter((d) => d.value > 0);

  if (data.length === 0 && totalRecords === 0) {
    return (
      <div className="p-6 rounded-2xl glass-card">
        <h3 className="font-display font-bold text-base text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <PieIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Sentiment Distribution
        </h3>
        <EmptyDiagnostic
          title="No Sentiment Distribution"
          message="No sentiment labels present in the active dataset."
          requiredFields={["sentiment"]}
          compact={true}
        />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="p-2.5 rounded-2xl bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-white/15 font-mono text-xs shadow-2xl text-slate-900 dark:text-white backdrop-blur-xl">
          <span className="font-bold">{item.name}: </span>
          <span className="text-slate-600 dark:text-slate-300">{item.value.toLocaleString()} ({item.percentage}%)</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 rounded-2xl glass-card flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Sentiment Distribution
          </h3>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">
            {totalRecords ? `${totalRecords.toLocaleString()} msgs` : ''}
          </span>
        </div>
        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
          Raw signal tone decomposition across active slice
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 mt-4">
        {/* Donut Chart */}
        <div className="w-36 h-36 relative shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={data.length > 0 ? data : [{ name: 'Empty', value: 1, color: '#e2e8f0' }]}
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={58}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-sm font-display font-extrabold text-slate-900 dark:text-white">{negPct}%</span>
            <span className="text-[9px] font-mono text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider">Negative</span>
          </div>
        </div>

        {/* Legend stats */}
        <div className="flex-1 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-700 dark:text-slate-300">Positive</span>
            </div>
            <strong className="text-slate-900 dark:text-white">{posPct}%</strong>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span className="text-slate-700 dark:text-slate-300">Neutral</span>
            </div>
            <strong className="text-slate-900 dark:text-white">{neuPct}%</strong>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-700 dark:text-slate-300">Negative</span>
            </div>
            <strong className="text-rose-600 dark:text-rose-400 font-bold">{negPct}%</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SentimentDonut;
