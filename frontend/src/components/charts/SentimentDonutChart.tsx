import React from 'react';
import { useApp } from '../../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';

export const SentimentDonutChart: React.FC = () => {
  const { data } = useApp();
  const dist = data?.sentiment_distribution || {};

  const chartData = [
    { name: 'Positive Sentiment', value: dist.positive?.count || 6326, percentage: dist.positive?.percentage || 42.6, color: '#10b981' },
    { name: 'Neutral Support', value: dist.neutral?.count || 5346, percentage: dist.neutral?.percentage || 36.0, color: '#64748b' },
    { name: 'Negative Complaints', value: dist.negative?.count || 3178, percentage: dist.negative?.percentage || 21.4, color: '#f43f5e' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-surface-card/95 backdrop-blur-xl border border-surface-border p-3 rounded-xl shadow-2xl text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-white">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.name}</span>
          </div>
          <div className="text-slate-300">
            Volume: <strong className="text-white font-mono">{item.value.toLocaleString()}</strong> ({item.percentage.toFixed(1)}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pbi-card flex flex-col justify-between">
      <div className="pbi-card-header">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <PieIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Sentiment Ratio Donut</h3>
            <p className="text-xs text-slate-400">Proportional voice polarity</p>
          </div>
        </div>
      </div>

      <div className="h-60 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#0e1526" strokeWidth={2} />
              ))}
            </Pie>
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => (
                <span className="text-xs text-slate-300 font-medium">{value} ({entry.payload.percentage.toFixed(1)}%)</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Label in Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
          <span className="text-xl font-extrabold text-white">100%</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Polarity</span>
        </div>
      </div>
    </div>
  );
};
