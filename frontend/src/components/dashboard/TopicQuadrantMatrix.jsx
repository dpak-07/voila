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
import { useTheme } from '../../context/ThemeContext';
import { useRun } from '../../context/RunContext';

export function TopicQuadrantMatrix({ topicSummaries = [] }) {
  const { selectedCompany } = useRun();
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const { isDark } = useTheme();

  const rawTopics = Array.isArray(topicSummaries) ? topicSummaries : [];

  // Filter and process complaint clusters (excluding raw background noise)
  const processedPoints = useMemo(() => {
    if (rawTopics.length === 0) return [];

    const valid = rawTopics
      .filter((t) => {
        const name = (t.cluster_name || t.topic_keywords || t.name || '').toLowerCase();
        return !name.includes('unclustered') && !name.includes('all combined');
      })
      .slice(0, 12);

    const volumes = valid.map((t) => Number(t.volume || t.total_cases || t.count || 1000));
    const sortedVols = [...volumes].sort((a, b) => a - b);
    const medianVol = sortedVols.length > 0 ? sortedVols[Math.floor(sortedVols.length / 2)] : 0;

    return valid.map((t, idx) => {
      const name = t.cluster_name || t.topic_keywords || `Complaint Cluster #${idx + 1}`;
      const vol = Number(t.volume || t.total_cases || t.count || 0);
      const negP = Number(
        t.negative_sentiment_percentage ??
        t.negative_percentage ??
        (vol > 0 ? ((t.negative_complaints || 0) / vol) * 100 : 26.5)
      );
      const pain = Number(t.pain_score || Math.round(vol * (negP / 100)));

      // Quadrant classification
      const isHighVol = vol >= medianVol;
      const isHighFriction = negP >= 24.0;

      let quadrant = 'baseline';
      let quadrantLabel = 'Standard Baseline';
      let color = '#64748b';

      if (isHighVol && isHighFriction) {
        quadrant = 'critical';
        quadrantLabel = 'Critical Friction (High Vol + Neg)';
        color = '#f43f5e';
      } else if (!isHighVol && isHighFriction) {
        quadrant = 'emerging';
        quadrantLabel = 'Emerging Volatility (High Neg)';
        color = '#f59e0b';
      } else if (isHighVol && !isHighFriction) {
        quadrant = 'high_vol_routine';
        quadrantLabel = 'High-Volume Routine (Low Neg)';
        color = '#3b82f6';
      } else {
        quadrant = 'baseline';
        quadrantLabel = 'Standard Baseline (Low Vol + Neg)';
        color = '#10b981';
      }

      return {
        id: idx,
        name,
        volume: vol,
        negativeRate: Number(negP.toFixed(1)),
        painScore: pain,
        quadrant,
        quadrantLabel,
        color,
        topQuote: t.verbatim_samples?.[0] || t.summary || 'Customer friction recorded.',
      };
    });
  }, [rawTopics]);

  const maxVol = useMemo(() => {
    return processedPoints.length > 0 ? Math.max(...processedPoints.map((p) => p.volume), 1) : 1;
  }, [processedPoints]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-white/15 shadow-2xl font-mono text-xs max-w-xs z-50 text-slate-900 dark:text-white backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-100 dark:border-white/10">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <strong className="font-display font-bold text-xs truncate">{data.name}</strong>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">Total Volume:</span>
              <strong className="font-bold text-slate-900 dark:text-white">{data.volume.toLocaleString()} msgs</strong>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">Negative Tone:</span>
              <strong className="text-rose-600 dark:text-rose-400 font-bold">{data.negativeRate}%</strong>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">Quadrant Category:</span>
              <span className="text-slate-700 dark:text-slate-300">{data.quadrantLabel}</span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/10 text-[10px] text-slate-400 text-center">
            Click point to inspect verbatim quotes
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 rounded-2xl glass-card space-y-5">
      {/* Evidence Drawer */}
      <RagEvidenceDrawer
        isOpen={isEvidenceOpen}
        onClose={() => setIsEvidenceOpen(false)}
        topicName={selectedTopic}
        company={selectedCompany}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>Topic Volume vs. Friction Quadrant Matrix</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                2x2 Priority Grid
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Categorizes complaint themes by ticket volume (X-axis) and negative sentiment share (Y-axis) to isolate systemic operational crises
            </p>
          </div>
        </div>
      </div>

      {/* 4 Quadrant Legend Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
            <span className="truncate font-bold">1. Critical Friction</span>
          </div>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">High Vol + High Neg</span>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <span className="truncate font-bold">2. Emerging Volatility</span>
          </div>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Low Vol + High Neg</span>
        </div>

        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/30 text-blue-800 dark:text-blue-300 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
            <span className="truncate font-bold">3. High-Volume Routine</span>
          </div>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">High Vol + Low Neg</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
            <span className="truncate font-bold">4. Standard Baseline</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Low Vol + Low Neg</span>
        </div>
      </div>

      {/* 2x2 Interactive Scatter Plot Grid */}
      <div className="h-80 w-full bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl p-2 border border-slate-200/80 dark:border-white/10 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 15 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#cbd5e1'} />
            <XAxis
              type="number"
              dataKey="volume"
              name="Volume"
              stroke={isDark ? '#94a3b8' : '#64748b'}
              fontSize={11}
              fontFamily="monospace"
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              domain={[0, Math.ceil(maxVol * 1.15)]}
              label={{
                value: 'Conversation Ticket Volume (Inbound Frequency) →',
                position: 'insideBottom',
                offset: -15,
                fill: isDark ? '#94a3b8' : '#64748b',
                fontSize: 10,
                fontFamily: 'monospace',
              }}
            />
            <YAxis
              type="number"
              dataKey="negativeRate"
              name="Negative Rate"
              stroke={isDark ? '#94a3b8' : '#64748b'}
              fontSize={11}
              fontFamily="monospace"
              tickFormatter={(v) => `${v}%`}
              domain={[0, 60]}
              label={{
                value: 'Negative Sentiment Friction (%) ↑',
                angle: -90,
                position: 'insideLeft',
                fill: isDark ? '#94a3b8' : '#64748b',
                fontSize: 10,
                fontFamily: 'monospace',
              }}
            />
            <ZAxis type="number" dataKey="painScore" range={[100, 500]} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={24} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '24% Friction Threshold', fill: '#f43f5e', fontSize: 10, fontFamily: 'monospace' }} />
            <Scatter
              data={processedPoints}
              onClick={(node) => {
                if (node && node.name) {
                  setSelectedTopic(node.name);
                  setIsEvidenceOpen(true);
                }
              }}
              className="cursor-pointer"
            >
              {processedPoints.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                  stroke={isDark ? '#0f172a' : '#ffffff'} 
                  strokeWidth={2}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TopicQuadrantMatrix;
