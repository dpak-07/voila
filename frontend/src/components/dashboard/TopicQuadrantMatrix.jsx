import React, { useMemo, useState } from 'react';
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
import { Target, Info, ShieldAlert, Sparkles, Flame, CheckCircle, ArrowUpRight } from 'lucide-react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';
import { RagEvidenceDrawer } from './RagEvidenceDrawer';

export function TopicQuadrantMatrix({ topicSummaries = [] }) {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

  const rawTopics = Array.isArray(topicSummaries) ? topicSummaries : [];

  // Filter and process complaint clusters (excluding raw background noise)
  const processedPoints = useMemo(() => {
    if (rawTopics.length === 0) return [];

    const valid = rawTopics
      .filter((t) => {
        const name = (t.cluster_name || t.topic_keywords || t.name || '').toLowerCase();
        // Exclude unclustered raw stream if present
        return !name.includes('unclustered') && !name.includes('all combined');
      })
      .slice(0, 12);

    const volumes = valid.map((t) => Number(t.volume || t.total_cases || t.count || 1000));
    const sortedVols = [...volumes].sort((a, b) => a - b);
    const medianVol = sortedVols.length > 0 ? sortedVols[Math.floor(sortedVols.length / 2)] : 8000;

    return valid.map((t, idx) => {
      const name = t.cluster_name || t.topic_keywords || `Complaint Cluster #${idx + 1}`;
      const vol = Number(t.volume || t.total_cases || t.count || 1200);
      const negP = Number(
        t.negative_sentiment_percentage ??
        t.negative_percentage ??
        (vol > 0 ? ((t.negative_complaints || 0) / vol) * 100 : 26.5)
      );
      const pain = Number(t.pain_score || Math.round(vol * (negP / 100)));

      // Quadrant classification
      const isHighVol = vol >= medianVol;
      const isHighFriction = negP >= 24.0; // 24% standard threshold

      let quadrant = 'baseline';
      let quadrantLabel = 'Standard Baseline';
      let color = '#64748b'; // Slate

      if (isHighVol && isHighFriction) {
        quadrant = 'critical';
        quadrantLabel = 'Critical Friction (High Vol + Neg)';
        color = '#e11d48'; // Rose/Red
      } else if (!isHighVol && isHighFriction) {
        quadrant = 'emerging';
        quadrantLabel = 'Emerging Volatility (High Neg)';
        color = '#d97706'; // Amber
      } else if (isHighVol && !isHighFriction) {
        quadrant = 'high_vol_routine';
        quadrantLabel = 'High-Volume Routine (Low Neg)';
        color = '#3b82f6'; // Blue
      } else {
        quadrant = 'baseline';
        quadrantLabel = 'Standard Baseline';
        color = '#94a3b8'; // Light Slate
      }

      return {
        id: `point-${idx}`,
        name,
        volume: vol,
        negativeRate: Math.round(negP * 10) / 10,
        painScore: pain,
        quadrant,
        quadrantLabel,
        color,
        rank: idx + 1,
        medianVol,
      };
    });
  }, [rawTopics]);

  if (processedPoints.length === 0) {
    return null;
  }

  const maxVol = Math.max(...processedPoints.map((p) => p.volume), 10000);
  const minVol = Math.min(...processedPoints.map((p) => p.volume), 0);
  const medianVol = processedPoints[0]?.medianVol || Math.round((maxVol + minVol) / 2);
  const frictionThreshold = 24.0; // SLA negative sentiment threshold

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3.5 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-2xl font-sans text-xs z-50 max-w-xs select-none">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-2">
            <strong className="text-white font-bold text-xs truncate">{data.name}</strong>
            <span
              className="text-[10px] px-2 py-0.5 rounded font-bold uppercase font-mono"
              style={{ backgroundColor: `${data.color}30`, color: data.color, border: `1px solid ${data.color}60` }}
            >
              {data.quadrant.toUpperCase()}
            </span>
          </div>

          <div className="space-y-1 text-slate-300 text-[11px] font-mono">
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Total Volume:</span>
              <strong className="text-white">{data.volume.toLocaleString()} msgs</strong>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Negative Tone:</span>
              <strong className="text-rose-400 font-bold">{data.negativeRate}%</strong>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Quadrant Category:</span>
              <span className="text-slate-200">{data.quadrantLabel}</span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400 text-center">
            Click point to inspect verbatim quotes
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
      {/* Evidence Drawer */}
      <RagEvidenceDrawer
        isOpen={isEvidenceOpen}
        onClose={() => setIsEvidenceOpen(false)}
        topicName={selectedTopic}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-base text-slate-900 flex items-center gap-2">
              <span>Topic Volume vs. Friction Quadrant Matrix</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                2x2 Priority Grid
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Categorizes complaint themes by ticket volume (X-axis) and negative sentiment share (Y-axis) to isolate systemic operational crises
            </p>
          </div>
        </div>
      </div>

      {/* 4 Quadrant Legend Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
            <span className="truncate font-bold">1. Critical Friction</span>
          </div>
          <span className="text-[10px] text-rose-600 font-medium">High Vol + High Neg</span>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0" />
            <span className="truncate font-bold">2. Emerging Volatility</span>
          </div>
          <span className="text-[10px] text-amber-600 font-medium">Low Vol + High Neg</span>
        </div>

        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
            <span className="truncate font-bold">3. High-Volume Routine</span>
          </div>
          <span className="text-[10px] text-blue-600 font-medium">High Vol + Low Neg</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0" />
            <span className="truncate font-bold">4. Standard Baseline</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Low Vol + Low Neg</span>
        </div>
      </div>

      {/* 2x2 Interactive Scatter Plot Grid */}
      <div className="h-80 w-full bg-slate-50/50 rounded-xl p-2 border border-slate-200/80 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 15 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              dataKey="volume"
              name="Volume"
              stroke="#64748b"
              fontSize={11}
              fontFamily="monospace"
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              domain={[0, Math.ceil(maxVol * 1.15)]}
              label={{
                value: 'Conversation Ticket Volume (Inbound Frequency) →',
                position: 'insideBottom',
                offset: -15,
                fill: '#475569',
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: 600,
              }}
            />
            <YAxis
              type="number"
              dataKey="negativeRate"
              name="Negative Rate"
              unit="%"
              stroke="#64748b"
              fontSize={11}
              fontFamily="monospace"
              domain={[0, 60]}
              label={{
                value: '← Negative Friction Tone (%)',
                angle: -90,
                position: 'insideLeft',
                offset: 5,
                fill: '#475569',
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: 600,
              }}
            />
            <ZAxis type="number" dataKey="painScore" range={[120, 480]} />

            {/* Quadrant Separation Reference Crosshairs */}
            <ReferenceLine
              y={frictionThreshold}
              stroke="#cbd5e1"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: '24% Friction Threshold', fill: '#94a3b8', fontSize: 10, position: 'right' }}
            />
            <ReferenceLine
              x={medianVol}
              stroke="#cbd5e1"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: 'Median Volume', fill: '#94a3b8', fontSize: 10, position: 'top' }}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Scatter Data Points */}
            <Scatter
              name="Complaint Topics"
              data={processedPoints}
              cursor="pointer"
              onClick={(entry) => {
                if (entry && entry.name) {
                  setSelectedTopic(entry.name);
                  setIsEvidenceOpen(true);
                }
              }}
            >
              {processedPoints.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="#ffffff"
                  strokeWidth={2}
                  className="hover:scale-125 transition-transform origin-center"
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Explanatory Guide Box */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-3 leading-relaxed">
        <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div>
          <strong className="text-slate-900 font-bold block mb-0.5">How Leadership Should Read This Matrix:</strong>
          <ul className="list-disc list-inside space-y-1 text-slate-600 font-medium">
            <li><strong className="text-rose-700">Top-Right (Critical Friction)</strong>: High-volume issues with severe customer dissatisfaction. Requires immediate engineering/operational hotfixes.</li>
            <li><strong className="text-amber-700">Top-Left (Emerging Volatility)</strong>: Low-volume but high-friction issues (e.g. recent software release bugs). Address before ticket volume escalates.</li>
            <li><strong className="text-blue-700">Bottom-Right (High-Volume Routine)</strong>: Frequent, low-friction inquiries (e.g. shipment tracking). Prime candidates for AI chatbot automated deflection.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default TopicQuadrantMatrix;
