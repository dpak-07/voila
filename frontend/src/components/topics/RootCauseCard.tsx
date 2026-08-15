import React from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { Lightbulb, Wrench, CheckCircle, ArrowRight, Target } from 'lucide-react';

export const RootCauseCard: React.FC = () => {
  const { data } = useApp();
  const recommendations = data?.recommendations || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm md:text-base font-bold text-white uppercase tracking-wider">
            Root Cause Analysis & Strategic Action Plan
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">Automated AI Root-Cause Reasoning</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.map((rec, idx) => (
          <div
            key={rec.id || idx}
            className="pbi-card flex flex-col justify-between hover:border-slate-600 transition group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-indigo-300 font-mono uppercase">
                  Action Item #{idx + 1}
                </span>
                <StatusBadge status={rec.status || 'In Progress'} />
              </div>

              <h4 className="text-sm font-bold text-white mb-2 leading-snug group-hover:text-primary-300 transition-colors">
                {rec.topic}
              </h4>

              {/* Root Cause Description */}
              <div className="p-3 rounded-lg bg-surface-100/70 border border-surface-border/60 text-xs mb-3 space-y-1">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">
                  Root Cause
                </span>
                <p className="text-slate-300 leading-relaxed">{rec.root_cause}</p>
              </div>

              {/* Suggested Remedy */}
              <div className="text-xs space-y-1 mb-3">
                <span className="font-bold text-emerald-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> Proposed Solution
                </span>
                <p className="text-slate-200 leading-relaxed">{rec.suggested_remedy}</p>
              </div>
            </div>

            {/* Estimated Impact Footer */}
            <div className="pt-3 border-t border-surface-border/50 text-xs text-slate-400 flex items-start gap-1.5">
              <Target className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-cyan-300">Expected ROI: </span>
                <span>{rec.estimated_impact}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
