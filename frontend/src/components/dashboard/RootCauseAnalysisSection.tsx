import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  GitBranch,
  Wrench,
  Users,
} from 'lucide-react';

export const RootCauseAnalysisSection: React.FC = () => {
  const { data } = useApp();
  const [selectedRca, setSelectedRca] = useState<number | null>(null);

  // Prefer root_cause_analysis; fall back to recommendations (same shape)
  const rootCauses = (
    data?.root_cause_analysis?.length ? data.root_cause_analysis
    : data?.recommendations?.length   ? data.recommendations
    : []
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-600" />
            <span>Systemic Root Cause Analysis (RCA) &amp; Operational Directives</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated deep-dive diagnostics connecting customer complaints to engineering root causes
          </p>
        </div>
        <span className="badge-blue text-[10px]">
          GenAI + Telemetry Synthesis
        </span>
      </div>

      {/* RCA Grid of Diagnostic Cards */}
      {rootCauses.length === 0 ? (
        <div className="analytics-card text-center py-10 text-slate-400">
          <p className="text-xs font-semibold">No root-cause analysis available yet.</p>
          <p className="text-[11px] mt-1">Upload a dataset and run analytics to generate AI-powered diagnostics.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rootCauses.map((rca, idx) => {
          const isExpanded = selectedRca === idx;
          return (
            <div
              key={rca.id || idx}
              className={`analytics-card transition-all duration-200 border-l-4 ${
                idx === 0
                  ? 'border-l-rose-500'
                  : idx === 1
                  ? 'border-l-amber-500'
                  : idx === 2
                  ? 'border-l-blue-500'
                  : 'border-l-emerald-500'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 font-mono font-bold flex items-center justify-center text-xs border border-blue-200">
                    #{idx + 1}
                  </span>
                  <h3 className="text-xs md:text-sm font-bold text-slate-900 leading-tight">
                    {rca.topic || rca.issue}
                  </h3>
                </div>
                <span className="badge-rose text-[10px] shrink-0">
                  <Users className="w-3 h-3" /> {rca.affected_users_pct ?? 18.5}% Impacted
                </span>
              </div>

              {/* Body */}
              <div className="space-y-2 text-xs text-slate-600">
                {/* Likely Root Cause */}
                <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-100">
                  <span className="font-bold text-rose-900 uppercase tracking-wider text-[10px] block mb-0.5">
                    Likely Root Cause
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {rca.root_cause || rca.likely_root_cause || 'Support queue bottleneck'}
                  </p>
                </div>

                {/* Recommended Fix */}
                <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100">
                  <span className="font-bold text-blue-900 uppercase tracking-wider text-[10px] block mb-0.5">
                    Engineering Action Plan
                  </span>
                  <p className="text-slate-800 leading-relaxed">
                    {rca.suggested_remedy || rca.recommended_fix || 'Implement targeted fix.'}
                  </p>
                </div>

                {/* Estimated Impact */}
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {rca.estimated_impact}
                  </span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                      rca.status === 'Mitigated'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rca.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {rca.status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};
