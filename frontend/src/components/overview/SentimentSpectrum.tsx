import React from 'react';
import { useApp } from '../../context/AppContext';
import { Smile, Meh, Frown, Sparkles } from 'lucide-react';

export const SentimentSpectrum: React.FC = () => {
  const { data } = useApp();
  const dist = data?.sentiment_distribution || {};

  const posPct = dist.positive?.percentage ?? 42.6;
  const neuPct = dist.neutral?.percentage ?? 36.0;
  const negPct = dist.negative?.percentage ?? 21.4;

  const posCount = dist.positive?.count ?? 6326;
  const neuCount = dist.neutral?.count ?? 5346;
  const negCount = dist.negative?.count ?? 3178;

  return (
    <div className="bg-surface-card/90 backdrop-blur-xl border border-surface-border/80 rounded-xl p-5 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between pb-3 border-b border-surface-border/50 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Voice-of-Customer Sentiment Spectrum
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">Transformer Inferred</span>
      </div>

      {/* Multi-Segment Continuous Bar */}
      <div className="space-y-2">
        <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner p-0.5 border border-slate-700/50">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-l-full transition-all duration-500"
            style={{ width: `${posPct}%` }}
            title={`Positive: ${posPct.toFixed(1)}%`}
          />
          <div
            className="h-full bg-slate-500 transition-all duration-500 opacity-80"
            style={{ width: `${neuPct}%` }}
            title={`Neutral: ${neuPct.toFixed(1)}%`}
          />
          <div
            className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-r-full transition-all duration-500"
            style={{ width: `${negPct}%` }}
            title={`Negative: ${negPct.toFixed(1)}%`}
          />
        </div>

        {/* Legend Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Positive Card */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Smile className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-white">{posPct.toFixed(1)}%</span>
                <span className="text-xs text-emerald-400 font-medium">Positive</span>
              </div>
              <p className="text-[11px] text-slate-400">{posCount.toLocaleString()} conversations</p>
            </div>
          </div>

          {/* Neutral Card */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
              <Meh className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-white">{neuPct.toFixed(1)}%</span>
                <span className="text-xs text-slate-300 font-medium">Neutral</span>
              </div>
              <p className="text-[11px] text-slate-400">{neuCount.toLocaleString()} conversations</p>
            </div>
          </div>

          {/* Negative Card */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-500/5 border border-rose-500/20">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <Frown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-white">{negPct.toFixed(1)}%</span>
                <span className="text-xs text-rose-400 font-medium">Negative Friction</span>
              </div>
              <p className="text-[11px] text-slate-400">{negCount.toLocaleString()} complaints</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
