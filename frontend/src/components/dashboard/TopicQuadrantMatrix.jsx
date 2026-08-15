import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Target, Layers, ArrowUpRight } from 'lucide-react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';

export function TopicQuadrantMatrix({ topicSummaries = [], onInspectTopic }) {
  const topics = Array.isArray(topicSummaries) ? topicSummaries : [];

  if (topics.length === 0) {
    return null;
  }

  // Calculate points
  const points = topics.slice(0, 10).map((t, idx) => {
    const name = t.cluster_name || t.topic_keywords || `Cluster #${idx + 1}`;
    const vol = Number(t.volume || t.total_cases || 0);
    const negP = Number(
      t.negative_sentiment_percentage ??
      (vol > 0 ? ((t.negative_complaints || 0) / vol) * 100 : 0)
    );
    const pain = Number(t.pain_score || vol * (negP / 100 + 0.2));

    return {
      name,
      volume: vol,
      negativeRate: Math.round(negP * 10) / 10,
      painScore: Math.round(pain),
      rank: idx + 1,
    };
  });

  const maxVol = Math.max(...points.map((p) => p.volume), 100);
  const midVol = Math.round(maxVol / 2);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3.5 rounded-xl bg-white border border-zinc-200 shadow-xl font-mono text-xs z-50 max-w-xs text-zinc-900">
          <p className="font-bold text-zinc-900 mb-1 border-b border-zinc-200 pb-1 flex items-center justify-between">
            <span>{data.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-300">
              Rank #{data.rank}
            </span>
          </p>
          <div className="space-y-1 text-zinc-700 text-[11px] pt-1">
            <div className="flex justify-between gap-4">
              <span>Total Volume:</span>
              <strong className="text-zinc-900">{data.volume.toLocaleString()} msgs</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>Negative Tone:</span>
              <strong className={data.negativeRate > 25 ? 'text-rose-600 font-bold' : 'text-zinc-800'}>
                {data.negativeRate}%
              </strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>Severity Index:</span>
              <strong className="text-zinc-900 font-bold">{data.painScore}</strong>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 rounded-2xl signal-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-zinc-900" />
            <h3 className="font-display font-bold text-base text-zinc-900">
              Topic Volume vs. Friction Quadrant
            </h3>
          </div>
          <p className="text-xs font-mono text-zinc-500 mt-0.5">
            Quadrant categorization isolating systemic operational friction
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge confidence="measured" size="sm" />
        </div>
      </div>

      {/* Quadrant Legend Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
          <span className="truncate font-semibold">Critical Friction (High Vol + Neg)</span>
        </div>
        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
          <span className="truncate font-semibold">Emerging Volatility</span>
        </div>
        <div className="p-2 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-800 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-zinc-700 shrink-0" />
          <span className="truncate font-semibold">High-Volume Routine</span>
        </div>
        <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-600 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-zinc-400 shrink-0" />
          <span className="truncate font-semibold">Standard Baseline</span>
        </div>
      </div>

      {/* Scatter Quadrant Chart */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              type="number"
              dataKey="volume"
              name="Volume"
              stroke="#71717a"
              fontSize={11}
              fontFamily="monospace"
              tickFormatter={(v) => `${v}`}
              label={{ value: 'Conversation Volume', position: 'insideBottom', offset: -10, fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
            />
            <YAxis
              type="number"
              dataKey="negativeRate"
              name="Negative Rate"
              unit="%"
              stroke="#71717a"
              fontSize={11}
              fontFamily="monospace"
              domain={[0, 100]}
              label={{ value: 'Negative Tone (%)', angle: -90, position: 'insideLeft', offset: 10, fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
            />
            <ZAxis type="number" dataKey="painScore" range={[100, 500]} />
            <ReferenceLine y={25} stroke="#d4d4d8" strokeDasharray="3 3" />
            <ReferenceLine x={midVol} stroke="#d4d4d8" strokeDasharray="3 3" />
            <Tooltip content={<CustomTooltip />} />
            <Scatter name="Complaint Clusters" data={points}>
              {points.map((entry, index) => {
                const isCritical = entry.volume >= midVol && entry.negativeRate >= 25;
                const isEmerging = entry.volume < midVol && entry.negativeRate >= 25;
                const isHighVol = entry.volume >= midVol && entry.negativeRate < 25;
                const fillColor = isCritical ? '#e11d48' : isEmerging ? '#d97706' : isHighVol ? '#09090b' : '#71717a';

                return <Cell key={`cell-${index}`} fill={fillColor} />;
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TopicQuadrantMatrix;
