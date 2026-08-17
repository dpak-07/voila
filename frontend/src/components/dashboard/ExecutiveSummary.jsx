import React from 'react';
import { Sparkles, CheckCircle2, Target, Zap, ShieldCheck, ArrowRight } from 'lucide-react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';

export function ExecutiveSummary({
  llmSummary = '',
  recommendations = [],
  rootCauseAnalysis = [],
}) {
  const rawRecs = (Array.isArray(recommendations) ? recommendations : []).map((item) => {
    if (typeof item === 'string' && item.trim().startsWith('{')) {
      try {
        return JSON.parse(item);
      } catch (e) {
        return item;
      }
    }
    return item;
  });

  return (
    <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                Prioritized Action Items & Interventions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Remediation roadmap mapped directly to operational friction drivers
              </p>
            </div>
          </div>
        </div>

        {/* List of Action Items */}
        <div className="space-y-2.5 pt-3">
          {rawRecs.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center">
              Ingest support conversations to synthesize tactical recommendations.
            </div>
          ) : (
            rawRecs.slice(0, 5).map((rec, idx) => {
              const action = typeof rec === 'object' ? (rec.action || rec.recommendation || JSON.stringify(rec)) : rec;
              const impact = typeof rec === 'object' ? (rec.impact || 'High Impact') : 'High Impact';
              const owner = typeof rec === 'object' ? (rec.owner || 'Operations') : 'Operations';

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3"
                >
                  <span className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {action}
                    </p>

                    <div className="flex items-center gap-2 mt-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold">
                        {owner}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                        {impact}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default ExecutiveSummary;
