import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TopicSummary } from '../../types';

interface TopicPainBarChartProps {
  topics: TopicSummary[];
}

export const TopicPainBarChart: React.FC<TopicPainBarChartProps> = ({ topics }) => {
  const chartData = topics.slice(0, 6).map((t, idx) => {
    const vol = t.volume || t.case_count || 0;
    const neg = t.negative_percentage || 0;
    const painScore = Math.round(vol * (neg / 100.0 + 0.2));
    const name = (t.topic || `Topic ${idx + 1}`).length > 24
      ? `${(t.topic || '').slice(0, 22)}...`
      : t.topic || `Topic ${idx + 1}`;

    return {
      name,
      fullName: t.topic,
      volume: vol,
      painScore,
      negativePct: neg,
    };
  });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
          barGap={4}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            stroke="#64748b"
            fontSize={10}
            tickLine={false}
            interval={0}
            angle={-15}
            textAnchor="end"
          />
          <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-lg text-xs space-y-1 max-w-xs">
                    <p className="font-bold text-slate-900 leading-snug">{d.fullName}</p>
                    <div className="pt-1 space-y-0.5 font-mono text-[11px]">
                      <p className="text-blue-700 font-semibold">
                        Total Volume: {d.volume.toLocaleString()} cases
                      </p>
                      <p className="text-rose-600 font-semibold">
                        Pain Score: {d.painScore.toLocaleString()}
                      </p>
                      <p className="text-slate-500">
                        Negative Share: {d.negativePct}%
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', paddingBottom: '6px' }}
          />
          <Bar
            dataKey="volume"
            name="Case Volume"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          <Bar
            dataKey="painScore"
            name="Calculated Pain Score"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
