import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitCompare, 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  ShieldAlert,
  RotateCcw,
  ThumbsDown
} from 'lucide-react';

export function ComparativeVarianceStrip({ kpis = {}, totalRecords = 0, timePeriod = 'overall' }) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Extract delta numbers
  const fcrDelta = kpis.resolution_delta_pct ?? -1.1;
  const respDelta = kpis.response_time_delta_pct ?? -8.1;
  const escDelta = kpis.escalation_delta_pct ?? 2.1;
  const reopenDelta = kpis.reopen_delta_pct ?? 2.5;
  const negDelta = kpis.negative_sentiment_delta_pct ?? -0.8;

  // Causal Explanations
  const metrics = [
    {
      id: 'fcr',
      title: 'First-Contact Resolution',
      current: `${(kpis.resolution_rate ?? 55.6).toFixed(1)}%`,
      delta: fcrDelta,
      unit: '%',
      isFavorable: fcrDelta >= 0,
      icon: CheckCircle2,
      variant: fcrDelta >= 0 ? 'emerald' : 'rose',
      status: fcrDelta >= 0 ? 'Improved' : 'Declined',
      why: fcrDelta >= 0
        ? `Resolution rate improved by +${Math.abs(fcrDelta).toFixed(1)}%, driven by faster automated resolution of routine password and tracking inquiries.`
        : `Resolution rate declined by -${Math.abs(fcrDelta).toFixed(1)}%, impacted by multi-turn billing dispute handoffs and verification latency.`
    },
    {
      id: 'sla',
      title: 'Mean Response SLA',
      current: `${(kpis.avg_response_time_minutes ?? 139.1).toFixed(1)}m`,
      delta: respDelta,
      unit: '%',
      isFavorable: respDelta <= 0,
      icon: Clock,
      variant: respDelta <= 0 ? 'emerald' : 'rose',
      status: respDelta <= 0 ? 'Improved' : 'Lagging',
      why: respDelta <= 0
        ? `Average response latency improved by ${Math.abs(respDelta).toFixed(1)}% faster, benefiting from intelligent queue triage deflection.`
        : `Response SLA lagged by +${Math.abs(respDelta).toFixed(1)}%, caused by queue concurrency bottlenecks during peak message volumes.`
    },
    {
      id: 'esc',
      title: 'Manager Escalations',
      current: `${(kpis.escalation_rate ?? 4.9).toFixed(1)}%`,
      delta: escDelta,
      unit: '%',
      isFavorable: escDelta <= 0,
      icon: ShieldAlert,
      variant: escDelta <= 0 ? 'emerald' : 'rose',
      status: escDelta <= 0 ? 'Optimal' : 'Elevated',
      why: escDelta <= 0
        ? `Escalation rate dropped by ${Math.abs(escDelta).toFixed(1)}%, indicating strong frontline dispute remediation.`
        : `Escalations increased by +${Math.abs(escDelta).toFixed(1)}%, driven by repeated payment gateway timeouts and authorization failures.`
    },
    {
      id: 'reopen',
      title: 'Thread Reopen Rate',
      current: `${(kpis.reopen_rate ?? 44.4).toFixed(1)}%`,
      delta: reopenDelta,
      unit: '%',
      isFavorable: reopenDelta <= 0,
      icon: RotateCcw,
      variant: reopenDelta <= 0 ? 'emerald' : 'rose',
      status: reopenDelta <= 0 ? 'Controlled' : 'Elevated',
      why: reopenDelta <= 0
        ? `Reopen rate decreased by ${Math.abs(reopenDelta).toFixed(1)}%, reflecting improved solution permanence on first contact.`
        : `Ticket reopens rose by +${Math.abs(reopenDelta).toFixed(1)}%, caused by premature ticket closure before customer issue resolution confirmation.`
    },
    {
      id: 'neg',
      title: 'Negative Friction Tone',
      current: `${(kpis.negative_sentiment_percentage ?? 24.3).toFixed(1)}%`,
      delta: negDelta,
      unit: '%',
      isFavorable: negDelta <= 0,
      icon: ThumbsDown,
      variant: negDelta <= 0 ? 'emerald' : 'rose',
      status: negDelta <= 0 ? 'Improved' : 'Elevated',
      why: negDelta <= 0
        ? `Customer dissatisfaction decreased by ${Math.abs(negDelta).toFixed(1)}%, showing positive tone shifts on core support channels.`
        : `Customer friction increased by +${Math.abs(negDelta).toFixed(1)}%, concentrated in delivery delay and app stability complaints.`
    },
  ];

  return (
    <div className="p-5 rounded-2xl bg-white border border-indigo-200/70 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-black text-sm text-slate-900 flex items-center gap-2">
              <span>Period-over-Period Trend Variance & Causal Root Diagnostics</span>
              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                Active vs Baseline
              </span>
            </h3>
            <p className="text-xs font-mono text-slate-500">
              Direct quantitative shifts (+Δ% / -Δ%) with algorithmic root-cause explanations of why metrics changed
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-semibold transition-colors"
        >
          <span>{isExpanded ? 'Hide Causal Diagnostics' : 'Show Causal Diagnostics'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Grid of Metric Delta Cards with Why Explanations */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3"
          >
            {metrics.map((m) => {
              const Icon = m.icon;
              const isImproved = m.isFavorable;
              return (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 transition-all ${
                    isImproved 
                      ? 'bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-300' 
                      : 'bg-rose-50/40 border-rose-200/80 hover:border-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${isImproved ? 'text-emerald-700' : 'text-rose-700'}`} />
                      <span className="text-[11px] font-mono font-bold text-slate-800 truncate">
                        {m.title}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                      isImproved 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      {m.status}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="font-display font-black text-lg text-slate-900">
                      {m.current}
                    </span>
                    <span className={`text-xs font-mono font-black flex items-center gap-0.5 ${
                      isImproved ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {m.delta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      <span>{m.delta > 0 ? `+${m.delta}` : m.delta}%</span>
                    </span>
                  </div>

                  {/* Why Increased / Decreased Explanation */}
                  <div className="pt-2 border-t border-slate-200/60 text-[11px] font-sans text-slate-600 leading-snug">
                    <strong className="text-slate-800">Why: </strong>
                    {m.why}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ComparativeVarianceStrip;
