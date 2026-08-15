import React from 'react';
import { useApp } from '../../context/AppContext';
import { TrendingDown, ShieldAlert, Clock, Sparkles, CheckCircle2, ArrowUpRight } from 'lucide-react';

export const StrategicPillars: React.FC = () => {
  const { data } = useApp();
  const pillars = data?.kpi_pillars || {};
  const reduc = pillars.issue_reduction_over_time || {};
  const sentImp = pillars.sentiment_impact || {};
  const fastMean = pillars.fast_mean_response_time || {};
  const aiBoost = pillars.ai_proposed_solution_impact || {};

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <span>Measurable Service-Quality Gains &amp; Strategic Insights</span>
        </h2>
        <span className="text-[11px] text-slate-500 font-medium">Impact Guided by Voice-of-Customer Signals</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pillar 1: Reduction in Recurring-Issue Volume Over Time */}
        <div className="analytics-card card-top-green flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Recurring Issue Reduction
              </span>
              <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                {reduc.reduction_rate_percentage !== undefined ? `${reduc.reduction_rate_percentage}%` : '—'}
              </span>
              {(reduc.recurring_tickets_count ?? 0) > 0 && (
                <span className="badge-emerald text-[11px]">
                  {reduc.recurring_tickets_count} recurring cases resolved
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
            Baseline Cases: <strong className="text-slate-700 font-mono">{reduc.baseline_cases ?? '—'}</strong> cases monitored across uploads
          </p>
        </div>

        {/* Pillar 2: Improved Sentiment Trend & Escalation Impact */}
        <div className="analytics-card card-top-rose flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Sentiment Impact on Escalation
              </span>
              <div className="p-1.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                {sentImp.negative_share_percentage !== undefined
                  ? `${Number(sentImp.negative_share_percentage).toFixed(1)}%`
                  : '—'}
              </span>
              <span className="text-xs text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Negative Friction
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
            <strong className="text-rose-600 font-bold">
              +{sentImp.delta_escalation_pct ?? Math.round(((sentImp.escalation_multiplier || 1.0) - 1.0) * 100)}% higher escalation rate
            </strong>{' '}
            on negative friction tickets
          </p>
        </div>

        {/* Pillar 3: Faster Mean Response Time */}
        <div className="analytics-card card-top-blue flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Faster Mean Response Time
              </span>
              <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                {fastMean.value_minutes !== undefined ? `${Number(fastMean.value_minutes).toFixed(1)} min` : '—'}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Avg Latency
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
            Resolution Proxy:{' '}
            <strong className="text-slate-700 font-mono">
              {fastMean.avg_resolution_proxy_minutes !== undefined
                ? `${Number(fastMean.avg_resolution_proxy_minutes).toFixed(1)} min`
                : '—'}
            </strong>
          </p>
        </div>

        {/* Pillar 4: Measurable Service-Quality Gains Guided by AI */}
        <div className="analytics-card card-top-blue flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                AI Guidance Speedup Boost
              </span>
              <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <span className="text-2xl md:text-3xl font-extrabold text-indigo-600 tracking-tight">
                {aiBoost.resolution_speedup_percentage !== undefined
                  ? `+${Number(aiBoost.resolution_speedup_percentage).toFixed(1)}%`
                  : '—'}
              </span>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Acceleration
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
            Resolution speedup achieved through AI-suggested remedies &amp; triage
          </p>
        </div>
      </div>
    </section>
  );
};
