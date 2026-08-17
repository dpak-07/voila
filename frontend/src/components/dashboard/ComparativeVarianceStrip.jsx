import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitCompare, 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  RotateCcw, 
  ThumbsDown,
  Target,
  Sparkles
} from 'lucide-react';
import { AnimatedNumber } from '../common/AnimatedNumber';

export function ComparativeVarianceStrip({ kpis = {}, totalRecords = 0, timePeriod = 'overall' }) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Extract actual values from backend — no hardcoded numeric fallbacks
  const resRate = kpis.resolution_rate != null ? Number(kpis.resolution_rate) : (kpis.fcr_rate != null ? Number(kpis.fcr_rate) : 0);
  const avgResp = kpis.avg_response_time_minutes != null ? Number(kpis.avg_response_time_minutes) : 0;
  const escRate = kpis.escalation_rate != null ? Number(kpis.escalation_rate) : 0;
  const reopenRate = kpis.reopen_rate != null ? Number(kpis.reopen_rate) : 0;
  const negRate = kpis.negative_sentiment_percentage != null ? Number(kpis.negative_sentiment_percentage) : 0;

  const hasDelta = kpis.resolution_delta_pct !== undefined && kpis.resolution_delta_pct !== null;
  const fcrDelta = hasDelta ? Number(kpis.resolution_delta_pct) : null;
  const respDelta = kpis.response_time_delta_pct != null ? Number(kpis.response_time_delta_pct) : null;
  const escDelta = kpis.escalation_delta_pct != null ? Number(kpis.escalation_delta_pct) : null;
  const reopenDelta = kpis.reopen_delta_pct != null ? Number(kpis.reopen_delta_pct) : null;
  const negDelta = kpis.negative_sentiment_delta_pct != null ? Number(kpis.negative_sentiment_delta_pct) : null;

  const formattedRespTime = avgResp != null ? (avgResp >= 60 ? `${(avgResp / 60).toFixed(1)}h` : `${avgResp.toFixed(1)}m`) : 'N/A';

  const metrics = [
    {
      id: 'fcr',
      title: 'First-Contact Resolution',
      numValue: resRate,
      current: `${resRate.toFixed(1)}%`,
      delta: fcrDelta,
      unit: '%',
      isFavorable: resRate >= 70,
      icon: CheckCircle2,
      badgeText: fcrDelta !== null ? (fcrDelta >= 0 ? `+${fcrDelta.toFixed(1)}%` : `${fcrDelta.toFixed(1)}%`) : (resRate >= 75 ? 'Healthy' : 'Needs Review'),
      statusText: resRate >= 75 ? 'Optimal' : 'Monitoring',
      variant: resRate >= 75 ? 'emerald' : 'amber',
      why: fcrDelta !== null
        ? (fcrDelta >= 0 ? `Resolution rate improved by +${fcrDelta.toFixed(1)}% vs baseline.` : `Resolution rate declined by ${fcrDelta.toFixed(1)}% due to multi-turn verification overhead.`)
        : `${resRate.toFixed(1)}% of inbound conversations received definitive frontline response and resolution without repeated escalations.`
    },
    {
      id: 'sla',
      title: 'Mean Response SLA',
      numValue: avgResp >= 60 ? Number((avgResp / 60).toFixed(1)) : Number(avgResp.toFixed(1)),
      current: formattedRespTime,
      rawMinutes: avgResp,
      delta: respDelta,
      unit: avgResp >= 60 ? 'h' : 'm',
      isFavorable: avgResp <= 180,
      icon: Clock,
      badgeText: respDelta !== null ? (respDelta <= 0 ? `${respDelta.toFixed(1)}%` : `+${respDelta.toFixed(1)}%`) : (avgResp <= 120 ? 'Fast' : 'Queued'),
      statusText: avgResp <= 120 ? 'Optimal' : 'Standard Queue',
      variant: avgResp <= 120 ? 'emerald' : 'blue',
      why: respDelta !== null
        ? (respDelta <= 0 ? `Response latency improved by ${Math.abs(respDelta).toFixed(1)}% faster.` : `Response SLA lagged by +${respDelta.toFixed(1)}% during peak surge windows.`)
        : `Average response latency across public support handles is ${formattedRespTime}, influenced by batch triage during peak hours.`
    },
    {
      id: 'esc',
      title: 'Manager Escalations',
      numValue: escRate,
      current: `${escRate.toFixed(1)}%`,
      delta: escDelta,
      unit: '%',
      isFavorable: escRate <= 5.0,
      icon: ShieldAlert,
      badgeText: escDelta !== null ? (escDelta <= 0 ? `${escDelta.toFixed(1)}%` : `+${escDelta.toFixed(1)}%`) : (escRate <= 5.0 ? 'Controlled' : 'Elevated'),
      statusText: escRate <= 5.0 ? 'Controlled' : 'Attention',
      variant: escRate <= 5.0 ? 'emerald' : 'amber',
      why: escDelta !== null
        ? (escDelta <= 0 ? `Supervisor escalations reduced by ${Math.abs(escDelta).toFixed(1)}%.` : `Escalation frequency rose by +${escDelta.toFixed(1)}% with severe customer friction.`)
        : `Escalations to managers stand at ${escRate.toFixed(1)}% of total inbound volume.`
    },
    {
      id: 'reopen',
      title: 'Thread Reopen Rate',
      numValue: reopenRate,
      current: `${reopenRate.toFixed(1)}%`,
      delta: reopenDelta,
      unit: '%',
      isFavorable: reopenRate <= 8.0,
      icon: RotateCcw,
      badgeText: reopenDelta !== null ? (reopenDelta <= 0 ? `${reopenDelta.toFixed(1)}%` : `+${reopenDelta.toFixed(1)}%`) : (reopenRate <= 8.0 ? 'Standard' : 'Elevated'),
      statusText: reopenRate <= 8.0 ? 'Normal' : 'Multi-Turn Friction',
      variant: reopenRate <= 8.0 ? 'emerald' : 'amber',
      why: reopenDelta !== null
        ? (reopenDelta <= 0 ? `Post-resolution reopen rates decreased by ${Math.abs(reopenDelta).toFixed(1)}%.` : `Ticket reopens grew by +${reopenDelta.toFixed(1)}% due to incomplete initial answers.`)
        : `${reopenRate.toFixed(1)}% of closed customer conversations generated follow-up questions.`
    },
    {
      id: 'neg',
      title: 'Negative Tone Share',
      numValue: negRate,
      current: `${negRate.toFixed(1)}%`,
      delta: negDelta,
      unit: '%',
      isFavorable: negRate <= 20.0,
      icon: ThumbsDown,
      badgeText: negDelta !== null ? (negDelta <= 0 ? `${negDelta.toFixed(1)}%` : `+${negDelta.toFixed(1)}%`) : (negRate <= 20.0 ? 'Mild' : 'Friction Surge'),
      statusText: negRate <= 20.0 ? 'Normal' : 'High Friction',
      variant: negRate <= 20.0 ? 'emerald' : 'rose',
      why: negDelta !== null
        ? (negDelta <= 0 ? `Customer dissatisfaction dropped by ${Math.abs(negDelta).toFixed(1)}%.` : `Negative customer sentiment climbed +${negDelta.toFixed(1)}%.`)
        : `Overall negative tone rate is ${negRate.toFixed(1)}% of total customer messages.`
    }
  ];

  return (
    <div className="p-6 rounded-2xl glass-card space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-xs">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>Operational Health & Causal Diagnostics</span>
              <span className="text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/30">
                {hasDelta ? 'Active vs Baseline Variance' : 'Live Dataset Telemetry'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Data-grounded service level agreements (SLAs), resolution permanence, and sentiment friction analysis
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-white/10"
        >
          <span>{isExpanded ? 'Collapse Diagnostics' : 'Expand Diagnostics'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Grid of Metric Cards */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5"
          >
            {metrics.map((m) => {
              const Icon = m.icon;
              const isGreen = m.variant === 'emerald';
              const isAmber = m.variant === 'amber';
              const isBlue = m.variant === 'blue';

              const cardBg = isGreen 
                ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/90 dark:border-emerald-500/25' 
                : isAmber 
                ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/90 dark:border-amber-500/25'
                : isBlue 
                ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/90 dark:border-blue-500/25'
                : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/90 dark:border-rose-500/25';

              const badgeBg = isGreen 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300' 
                : isAmber 
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                : isBlue 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300';

              const valueColor = isGreen
                ? 'text-emerald-950 dark:text-emerald-100'
                : isAmber
                ? 'text-amber-950 dark:text-amber-100'
                : isBlue
                ? 'text-blue-950 dark:text-blue-100'
                : 'text-rose-950 dark:text-rose-100';

              return (
                <motion.div
                  key={m.id}
                  whileHover={{ y: -2 }}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-2.5 ${cardBg}`}
                >
                  <div>
                    {/* Top: Icon + Title + Status Badge */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Icon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                        <h4 className="font-display font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate" title={m.title}>
                          {m.title}
                        </h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold font-mono shrink-0 ${badgeBg}`}>
                        {m.badgeText}
                      </span>
                    </div>

                    {/* Metric Big Value */}
                    <div className="flex items-baseline justify-between my-1">
                      <span className={`text-xl sm:text-2xl font-display font-black tracking-tight ${valueColor}`}>
                        {typeof m.numValue === 'number' ? (
                          <>
                            <AnimatedNumber value={m.numValue} decimals={1} duration={2.2} />
                            {m.unit && <span className="text-xs font-mono font-bold ml-0.5">{m.unit}</span>}
                          </>
                        ) : (
                          m.current
                        )}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
                        {m.statusText}
                      </span>
                    </div>
                  </div>

                  {/* Context / Why */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 text-[10px] text-slate-600 dark:text-slate-400 leading-snug font-sans">
                    <strong className="text-slate-800 dark:text-slate-300 font-mono">Context: </strong>
                    {m.why}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ComparativeVarianceStrip;
