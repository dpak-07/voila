import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { SentimentDistribution } from '../../types';

interface SentimentDonutChartProps {
  distribution?: SentimentDistribution;
}

export const SentimentDonutChart: React.FC<SentimentDonutChartProps> = ({ distribution }) => {
  const pos = distribution?.positive?.percentage ?? 21.5;
  const neu = distribution?.neutral?.percentage ?? 57.0;
  const neg = distribution?.negative?.percentage ?? 21.5;

  const data = [
    { name: 'Positive', value: pos, color: '#10b981', count: distribution?.positive?.count ?? 3192 },
    { name: 'Neutral', value: neu, color: '#94a3b8', count: distribution?.neutral?.count ?? 8464 },
    { name: 'Negative', value: neg, color: '#ef4444', count: distribution?.negative?.count ?? 3192 },
  ];

  return (
    <div className="h-48 w-full flex items-center justify-center relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
            stroke="#ffffff"
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-lg text-xs space-y-1">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name} Sentiment
                    </p>
                    <p className="text-slate-600 font-mono">
                      Share: <strong>{d.value.toFixed(1)}%</strong>
                    </p>
                    {d.count !== undefined && (
                      <p className="text-slate-500 font-mono text-[11px]">
                        Volume: {d.count.toLocaleString()} cases
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Polarity</span>
        <span className="text-lg font-extrabold text-slate-800">
          {(100 - neg).toFixed(0)}%
        </span>
        <span className="text-[10px] text-emerald-600 font-semibold">Non-Negative</span>
      </div>
    </div>
  );
};
