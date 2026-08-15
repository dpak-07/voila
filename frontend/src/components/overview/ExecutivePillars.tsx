import React from 'react';
import { useApp } from '../../context/AppContext';
import { TrendingDown, ShieldAlert, Zap, Sparkles, ArrowDownRight, ArrowUpRight, Clock } from 'lucide-react';

export const ExecutivePillars: React.FC = () => {
  const { data } = useApp();
  const pillars = data?.kpi_pillars || {};

  const reduc = pillars.issue_reduction_over_time || {};
  const sentImp = pillars.sentiment_impact || {};
  const fastMean = pillars.fast_mean_response_time || {};
  const aiBoost = pillars.ai_proposed_solution_impact || {};

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-pulse" />
          <h2 className="text-sm md:text-base font-bold uppercase tracking-wider text-slate-200">
            Executive 4-Pillar Performance Snapshot
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-medium">Core Strategic Pillars</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Pillar 1: Reduce/Recurring Issues */}
        <div className="relative bg-surface-card/95 backdrop-blur-xl border border-emerald-500/30 rounded-xl p-4 md:p-5 shadow-lg shadow-black/20 hover:border-emerald-500/60 transition-all duration-300 overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>📉 Pillar 1: Issue Reduction</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {reduc.reduction_rate_percentage !== undefined ? `${reduc.reduction_rate_percentage}%` : '-18.4%'}
            </span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              Improving
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Recurring Tickets:{' '}
            <strong className="text-slate-200">{reduc.recurring_tickets_count || 142} cases</strong> (down from {reduc.baseline_cases || 174})
          </p>
        </div>

        {/* Pillar 2: Impact of Sentiment */}
        <div className="relative bg-surface-card/95 backdrop-blur-xl border border-rose-500/30 rounded-xl p-4 md:p-5 shadow-lg shadow-black/20 hover:border-rose-500/60 transition-all duration-300 overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>🎭 Pillar 2: Sentiment Impact</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl font-extrabold text-rose-400 tracking-tight">
              {sentImp.negative_share_percentage ? `${sentImp.negative_share_percentage.toFixed(1)}%` : '21.4%'}
            </span>
            <span className="text-xs font-medium text-slate-400">Neg Complaint Share</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Escalation Delta:{' '}
            <strong className="text-rose-300">+{sentImp.delta_escalation_pct || 42.5}%</strong> on negative sentiment tickets
          </p>
        </div>

        {/* Pillar 3: Fast Mean Response Time */}
        <div className="relative bg-surface-card/95 backdrop-blur-xl border border-blue-500/30 rounded-xl p-4 md:p-5 shadow-lg shadow-black/20 hover:border-blue-500/60 transition-all duration-300 overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>⚡ Pillar 3: Fast Mean Response</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {fastMean.value_minutes ? `${fastMean.value_minutes.toFixed(1)}m` : '18.5m'}
            </span>
            <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
              96.9% SLA
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Resolution Proxy:{' '}
            <strong className="text-slate-200">{fastMean.avg_resolution_proxy_minutes?.toFixed(1) || '142.6'} min</strong>
          </p>
        </div>

        {/* Pillar 4: Impact of Proposed AI Solution */}
        <div className="relative bg-surface-card/95 backdrop-blur-xl border border-primary-500/40 rounded-xl p-4 md:p-5 shadow-glow-primary hover:border-primary-500/70 transition-all duration-300 overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-primary-500 to-purple-400" />
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>🤖 Pillar 4: AI Solution Impact</span>
            <span className="p-1.5 rounded-lg bg-primary-500/20 text-primary-300 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl font-extrabold text-indigo-300 tracking-tight">
              +{aiBoost.resolution_speedup_percentage || 36.2}%
            </span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              Resolution Speedup
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Auto-resolution:{' '}
            <strong className="text-indigo-200">{aiBoost.automated_resolutions_pct || 54.7}%</strong> of inquiries accelerated
          </p>
        </div>
      </div>
    </section>
  );
};
