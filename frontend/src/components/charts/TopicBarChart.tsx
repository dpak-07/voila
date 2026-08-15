import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

export const TopicBarChart: React.FC = () => {
  const { data } = useApp();
  const topics = data?.topic_summaries || [];

  const chartData = topics.slice(0, 6).map((t) => ({
    name: t.topic ? (t.topic.length > 22 ? t.topic.slice(0, 20) + '...' : t.topic) : 'General',
    fullName: t.topic,
    volume: t.volume || t.case_count || 0,
    negativePct: t.negative_percentage || 0,
    escalationRate: t.escalation_rate || 0,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-obsidian-850/98 backdrop-blur-2xl border border-surface-border p-3.5 rounded-xl shadow-2xl text-xs space-y-1 max-w-xs">
          <p className="font-bold text-white leading-tight">{item.fullName}</p>
          <div className="pt-1 text-slate-300 space-y-0.5">
            <div className="flex justify-between">
              <span className="text-indigo-400">Total Cases:</span>
              <strong className="text-white font-mono">{item.volume.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-rose-400">Negative Friction:</span>
              <strong className="text-rose-300 font-mono">{item.negativePct}%</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-400">Escalation Rate:</span>
              <strong className="text-amber-300 font-mono">{item.escalationRate}%</strong>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="executive-card flex flex-col justify-between h-full">
      <div className="executive-card-header">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs md:text-sm font-bold text-white">Cluster Case Volume Distribution</h3>
            <p className="text-[11px] text-slate-400">Ranked cluster volume &amp; sentiment risk</p>
          </div>
        </div>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1a243a" horizontal={false} opacity={0.7} />
            <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#64748b"
              width={120}
              tick={{ fill: '#cbd5e1', fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="volume" name="Case Count" fill="#6366f1" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.negativePct > 50 ? '#f43f5e' : entry.negativePct > 35 ? '#f59e0b' : '#6366f1'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
