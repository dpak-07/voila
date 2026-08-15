import React from 'react';
import { useApp } from '../../context/AppContext';
import { TrendingDown, ShieldAlert, Zap, Sparkles, ArrowDownRight, ArrowUpRight, Clock, Target } from 'lucide-react';

export const ExecutivePillars: React.FC = () => {
  const { data } = useApp();
  const pillars = data?.kpi_pillars || {};

  const reduc = pillars.issue_reduction_over_time || {};
  const sentImp = pillars.sentiment_impact || {};
  const fastMean = pillars.fast_mean_response_time || {};
  const aiBoost = pillars.ai_proposed_solution_impact || {};

  return (
    <section className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
          <h2 className="text-xs md:text-sm font-extrabold uppercase tracking-wider text-slate-300 font-mono">
            Executive 4-Pillar Strategic Snapshot
          </h2>
        </div>
        <span className="text-[11px] text-slate-500 font-mono font-semibold">Core Performance Pillars</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Pillar 1: Issue Reduction */}
        <div className="relative bg-obsidian-850/95 backdrop-blur-xl border border-emerald-500/25 rounded-2xl p-5 shadow-lg hover:border-emerald-500/50 hover:shadow-glow-emerald transition-all duration-300 overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>📉 Pillar 1: Issue Reduction</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingDown className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl font-extrabold text-white tracking-tight font-sans">
              {reduc.reduction_rate_percentage !== undefined ? `${reduc.reduction_rate_percentage}%` : '-18.4%'}
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              Improving
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2.5 pt-2 border-t border-surface-border/50">
            Recurring Inquiries:{' '}
            <strong className="text-slate-200 font-mono">{reduc.recurring_tickets_count || 142} cases</strong> (down from {reduc.baseline_cases || 174})
          </p>
        </div>

        {/* Pillar 2: Sentiment Friction Impact */}
        <div className="relative bg-obsidian-850/95 backdrop-blur-xl border border-rose-500/25 rounded-2xl p-5 shadow-lg hover:border-rose-500/50 hover:shadow-glow-rose transition-all duration-300 overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-500 to-amber-500" />
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>🎭 Pillar 2: Sentiment Impact</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl font-extrabold text-rose-400 tracking-tight font-sans">
              {sentImp.negative_share_percentage ? `${sentImp.negative_share_percentage.toFixed(1)}%` : '21.4%'}
            </span>
            <span className="text-[11px] font-medium text-slate-400">Negative Complaint Share</span>
          </div>
          <p className="text-xs text-slate-400 mt-2.5 pt-2 border-t border-surface-border/50">
            Escalation Multiplier:{' '}
            <strong className="text-rose-300 font-mono">+{sentImp.delta_escalation_pct || 42.5}%</strong> on friction tickets
          </p>
        </div>

        {/* Pillar 3: Fast Mean Response Time */}
        <div className="relative bg-obsidian-850/95 backdrop-blur-xl border border-cyan-500/25 rounded-2xl p-5 shadow-lg hover:border-cyan-500/50 hover:shadow-glow-cyan transition-all duration-300 overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-400 to-blue-500" />
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>⚡ Pillar 3: Fast Mean Latency</span>
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl font-extrabold text-white tracking-tight font-sans">
              {fastMean.value_minutes ? `${fastMean.value_minutes.toFixed(1)}m` : '18.5m'}
            </span>
            <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
              96.9% SLA
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2.5 pt-2 border-t border-surface-border/50">
            Avg Resolution Proxy:{' '}
            <strong className="text-slate-200 font-mono">{fastMean.avg_resolution_proxy_minutes?.toFixed(1) || '142.6'} min</strong>
          </p>
        </div>

        {/* Pillar 4: AI Proposed Solution Impact */}
        <div className="relative bg-obsidian-850/95 backdrop-blur-xl border border-primary-500/35 rounded-2xl p-5 shadow-glow-primary hover:border-primary-500/60 transition-all duration-300 overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-primary-500 to-purple-400" />
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>🤖 Pillar 4: AI Solution Boost</span>
            <span className="p-1.5 rounded-lg bg-primary-500/20 text-primary-300 border border-primary-500/30 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl font-extrabold text-indigo-200 tracking-tight font-sans">
              +{aiBoost.resolution_speedup_percentage || 36.2}%
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              Speedup
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2.5 pt-2 border-t border-surface-border/50">
            Auto-Resolutions:{' '}
            <strong className="text-indigo-200 font-mono">{aiBoost.automated_resolutions_pct || 54.7}%</strong> automated triage
          </p>
        </div>
      </div>
    </section>
  );
};
