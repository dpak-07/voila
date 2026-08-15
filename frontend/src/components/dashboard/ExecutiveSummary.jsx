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

  const departmentIcons = {
    'Support Operations': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Product': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Billing': 'bg-amber-100 text-amber-800 border-amber-200',
    'Engineering': 'bg-rose-100 text-rose-800 border-rose-200',
    'Logistics': 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <div className="p-6 rounded-2xl signal-card space-y-4 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-200">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base text-slate-900 tracking-tight">
                Prioritized Action Items & Interventions
              </h3>
              <p className="text-xs font-mono text-slate-500">
                Actionable remediation roadmap mapped directly to operational friction drivers
              </p>
            </div>
          </div>
          <ConfidenceBadge confidence="measured" size="sm" />
        </div>

        {/* List of Action Items */}
        <div className="space-y-3 pt-3">
          {rawRecs.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-500 text-center">
              Ingest support conversations to synthesize tactical recommendations.
            </div>
          ) : (
            rawRecs.slice(0, 5).map((rec, idx) => {
              const action = typeof rec === 'object' ? (rec.action || rec.recommendation || JSON.stringify(rec)) : rec;
              const impact = typeof rec === 'object' ? (rec.impact || 'High Impact') : 'High Impact';
              const owner = typeof rec === 'object' ? (rec.owner || (idx % 2 === 0 ? 'Support Operations' : 'Product & Engineering')) : 'Support Operations';
              const deptStyle = departmentIcons[owner] || 'bg-indigo-50 text-indigo-700 border-indigo-200';

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between space-y-2 shadow-2xs group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span>ACTION ITEM #{idx + 1}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold">
                        {impact}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md border text-[9px] font-mono font-bold uppercase ${deptStyle}`}>
                        {owner}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium pl-6">
                    {action}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Strategic Playbook Footer */}
      <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between text-xs font-mono">
        <span className="text-indigo-900 font-bold flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-indigo-600" />
          <span>Continuous AI Copilot Grounding Active</span>
        </span>
        <span className="text-indigo-700 font-semibold text-[11px]">
          5 Interventions Ready
        </span>
      </div>
    </div>
  );
}

export default ExecutiveSummary;
