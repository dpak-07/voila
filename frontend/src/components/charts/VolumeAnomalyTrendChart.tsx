import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceDot,
} from 'recharts';
import { TrendDataPoint } from '../../types';

interface VolumeAnomalyTrendChartProps {
  trends?: TrendDataPoint[];
}

export const VolumeAnomalyTrendChart: React.FC<VolumeAnomalyTrendChartProps> = ({ trends }) => {
  const defaultData: TrendDataPoint[] = [
    { date: 'Mon', total_volume: 1840, positive_volume: 395, negative_volume: 395, neutral_volume: 1050, avg_response_time: 48.2, is_spike: false, z_score: 0.4 },
    { date: 'Tue', total_volume: 2120, positive_volume: 455, negative_volume: 455, neutral_volume: 1210, avg_response_time: 49.0, is_spike: false, z_score: 0.8 },
    { date: 'Wed', total_volume: 3450, positive_volume: 741, negative_volume: 1240, neutral_volume: 1469, avg_response_time: 58.4, is_spike: true, z_score: 3.2, spike_reason: 'Android 14 App Update Crash Spike' },
    { date: 'Thu', total_volume: 2650, positive_volume: 569, negative_volume: 569, neutral_volume: 1512, avg_response_time: 49.5, is_spike: false, z_score: 1.4 },
    { date: 'Fri', total_volume: 2280, positive_volume: 490, negative_volume: 490, neutral_volume: 1300, avg_response_time: 47.5, is_spike: false, z_score: 0.9 },
    { date: 'Sat', total_volume: 1340, positive_volume: 288, negative_volume: 288, neutral_volume: 764, avg_response_time: 45.2, is_spike: false, z_score: 0.2 },
    { date: 'Sun', total_volume: 1170, positive_volume: 251, negative_volume: 251, neutral_volume: 668, avg_response_time: 44.8, is_spike: false, z_score: 0.1 },
  ];

  const data = (trends && trends.length > 0) ? trends : defaultData;
  const spikePoint = data.find((d) => d.is_spike || (d.z_score && d.z_score > 2.0));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
          <YAxis yAxisId="left" stroke="#64748b" fontSize={10} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={10} tickLine={false} unit="m" />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-lg text-xs space-y-1">
                    <p className="font-bold text-slate-800 flex items-center justify-between gap-2">
                      <span>{label} Timeline</span>
                      {d.is_spike && (
                        <span className="badge-rose text-[9px] py-0 px-1 font-extrabold">
                          Spike: Z={d.z_score}σ
                        </span>
                      )}
                    </p>
                    <div className="space-y-0.5 font-mono text-[11px]">
                      <p className="text-blue-700 font-semibold">
                        Total Volume: {d.total_volume?.toLocaleString()}
                      </p>
                      <p className="text-rose-600 font-semibold">
                        Negative Tickets: {d.negative_volume?.toLocaleString()}
                      </p>
                      <p className="text-slate-600">
                        Response Time: {d.avg_response_time?.toFixed(1)} min
                      </p>
                    </div>
                    {d.spike_reason && (
                      <p className="text-[10px] text-rose-700 italic border-t border-slate-100 pt-1">
                        Reason: {d.spike_reason}
                      </p>
                    )}
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
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="total_volume"
            name="Total Volume"
            fill="url(#volumeGrad)"
            stroke="#2563eb"
            strokeWidth={2}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="negative_volume"
            name="Negative Volume"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 3, fill: '#ef4444' }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avg_response_time"
            name="Mean Response Time (min)"
            stroke="#10b981"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
          {spikePoint && (
            <ReferenceDot
              yAxisId="left"
              x={spikePoint.date}
              y={spikePoint.total_volume}
              r={6}
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth={2}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
