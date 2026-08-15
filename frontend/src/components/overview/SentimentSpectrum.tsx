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
    <div className="executive-card">
      <div className="executive-card-header">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs md:text-sm font-bold text-white uppercase tracking-wider">
              Voice-of-Customer Sentiment Spectrum
            </h3>
            <p className="text-[11px] text-slate-400">Transformer polarity inference across active conversation stream</p>
          </div>
        </div>
        <span className="text-[10px] text-slate-400 font-mono font-bold px-2 py-0.5 rounded bg-surface-100 border border-surface-border">
          DistilBERT Inferred
        </span>
      </div>

      {/* Multi-Segment Continuous Bar */}
      <div className="space-y-3">
        <div className="h-4 w-full bg-obsidian-950 rounded-full overflow-hidden flex shadow-inner p-0.5 border border-surface-border">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-l-full transition-all duration-500 shadow-glow-emerald"
            style={{ width: `${posPct}%` }}
            title={`Positive: ${posPct.toFixed(1)}%`}
          />
          <div
            className="h-full bg-slate-600 transition-all duration-500 opacity-70"
            style={{ width: `${neuPct}%` }}
            title={`Neutral: ${neuPct.toFixed(1)}%`}
          />
          <div
            className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-r-full transition-all duration-500 shadow-glow-rose"
            style={{ width: `${negPct}%` }}
            title={`Negative: ${negPct.toFixed(1)}%`}
          />
        </div>

        {/* Legend Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Positive Card */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Smile className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-extrabold text-white">{posPct.toFixed(1)}%</span>
                <span className="text-[11px] text-emerald-400 font-semibold">Positive Delight</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">{posCount.toLocaleString()} conversations</p>
            </div>
          </div>

          {/* Neutral Card */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/40">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
              <Meh className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-extrabold text-white">{neuPct.toFixed(1)}%</span>
                <span className="text-[11px] text-slate-300 font-semibold">Neutral Inquiries</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">{neuCount.toLocaleString()} conversations</p>
            </div>
          </div>

          {/* Negative Card */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Frown className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-extrabold text-white">{negPct.toFixed(1)}%</span>
                <span className="text-[11px] text-rose-400 font-semibold">Negative Friction</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">{negCount.toLocaleString()} complaints</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
