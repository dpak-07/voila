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
    { name: 'Positive', value: posCount, percentage: posPct, color: '#09090b' },
    { name: 'Neutral', value: neuCount, percentage: neuPct, color: '#71717a' },
    { name: 'Negative', value: negCount, percentage: negPct, color: '#e11d48' },
  ].filter((d) => d.value > 0);

  if (data.length === 0 && totalRecords === 0) {
    return (
      <div className="p-6 rounded-2xl signal-card">
        <h3 className="font-display font-bold text-base text-zinc-900 mb-2 flex items-center gap-2">
          <PieIcon className="w-4 h-4 text-zinc-700" />
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
        <div className="p-2.5 rounded-xl bg-white border border-zinc-200 font-mono text-xs shadow-xl text-zinc-900">
          <span className="font-bold text-zinc-900">{item.name}: </span>
          <span className="text-zinc-700">{item.value.toLocaleString()} ({item.percentage}%)</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 rounded-2xl signal-card flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-bold text-base text-zinc-900 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-zinc-700" />
            Sentiment Distribution
          </h3>
          <span className="text-xs font-mono text-zinc-500 font-semibold">
            {totalRecords ? `${totalRecords.toLocaleString()} msgs` : ''}
          </span>
        </div>
        <p className="text-xs font-mono text-zinc-500">
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
                data={data.length > 0 ? data : [{ name: 'Empty', value: 1, color: '#e4e4e7' }]}
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
            <span className="text-sm font-display font-extrabold text-zinc-900">{negPct}%</span>
            <span className="text-[9px] font-mono text-rose-600 font-bold uppercase tracking-wider">Negative</span>
          </div>
        </div>

        {/* Legend stats */}
        <div className="flex-1 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-900" />
              <span className="text-zinc-800 font-medium">Positive</span>
            </div>
            <span className="font-bold text-zinc-900">{posPct}%</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
              <span className="text-zinc-600 font-medium">Neutral</span>
            </div>
            <span className="font-bold text-zinc-700">{neuPct}%</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              <span className="text-zinc-800 font-medium">Negative</span>
            </div>
            <span className="font-bold text-rose-600">{negPct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SentimentDonut;
