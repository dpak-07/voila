import React from 'react';
import { useApp } from '../../context/AppContext';
import { Smile, Meh, Frown } from 'lucide-react';
import { SentimentDonutChart } from '../charts/SentimentDonutChart';

export const SentimentAnalysisBar: React.FC = () => {
  const { data } = useApp();
  const dist = data?.sentiment_distribution || {};

  const posPct = dist.positive?.percentage ?? 0;
  const neuPct = dist.neutral?.percentage ?? 0;
  const negPct = dist.negative?.percentage ?? 0;

  const posCount = dist.positive?.count ?? 0;
  const neuCount = dist.neutral?.count ?? 0;
  const negCount = dist.negative?.count ?? 0;

  return (
    <div className="analytics-card space-y-4">
      <div className="analytics-card-header">
        <div>
          <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <span>Sentiment Health &amp; Polarity Trajectory</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Continuous sentiment percentage polarity across active support dataset
          </p>
        </div>
        <span className="badge-blue text-[10px]">
          Transformer Model Polarity
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        {/* Left 2 Cols: Continuous Bar and Legend Cards */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tri-color continuous percentage bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600 px-1">
              <span>Continuous Sentiment Bar</span>
              <span className="font-mono text-[11px] text-slate-500">100% Volume</span>
            </div>
            <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner p-0.5 border border-slate-200">
              <div
                className="h-full bg-emerald-500 rounded-l-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                style={{ width: `${posPct}%` }}
                title={`🟢 Positive: ${posPct.toFixed(1)}%`}
              >
                {posPct > 12 ? `${posPct.toFixed(1)}%` : ''}
              </div>
              <div
                className="h-full bg-slate-400 transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                style={{ width: `${neuPct}%` }}
                title={`⚪ Neutral: ${neuPct.toFixed(1)}%`}
              >
                {neuPct > 15 ? `${neuPct.toFixed(1)}%` : ''}
              </div>
              <div
                className="h-full bg-rose-500 rounded-r-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                style={{ width: `${negPct}%` }}
                title={`🔴 Negative: ${negPct.toFixed(1)}%`}
              >
                {negPct > 12 ? `${negPct.toFixed(1)}%` : ''}
              </div>
            </div>
          </div>

          {/* Metric Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Positive */}
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
              <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-700">
                <Smile className="w-4 h-4" />
              </div>
              <div>
                <span className="text-base font-extrabold text-emerald-800">{posPct.toFixed(1)}%</span>
                <p className="text-[11px] text-emerald-700 font-semibold">🟢 Positive (Emerald)</p>
                <p className="text-[10px] text-slate-500 font-mono">{posCount.toLocaleString()} cases</p>
              </div>
            </div>

            {/* Neutral */}
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="p-1.5 rounded-md bg-slate-200 text-slate-700">
                <Meh className="w-4 h-4" />
              </div>
              <div>
                <span className="text-base font-extrabold text-slate-800">{neuPct.toFixed(1)}%</span>
                <p className="text-[11px] text-slate-700 font-semibold">⚪ Neutral (Slate)</p>
                <p className="text-[10px] text-slate-500 font-mono">{neuCount.toLocaleString()} cases</p>
              </div>
            </div>

            {/* Negative */}
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-rose-50/70 border border-rose-200">
              <div className="p-1.5 rounded-md bg-rose-100 text-rose-700">
                <Frown className="w-4 h-4" />
              </div>
              <div>
                <span className="text-base font-extrabold text-rose-800">{negPct.toFixed(1)}%</span>
                <p className="text-[11px] text-rose-700 font-semibold">🔴 Negative (Crimson)</p>
                <p className="text-[10px] text-slate-500 font-mono">{negCount.toLocaleString()} complaints</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Graphical Donut Chart */}
        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            Polarity Donut Visual
          </span>
          <SentimentDonutChart distribution={dist} />
        </div>
      </div>
    </div>
  );
};
