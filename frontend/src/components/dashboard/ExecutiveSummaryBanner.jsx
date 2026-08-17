import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Filter, Zap, Target } from 'lucide-react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';

// Helper to parse inline **bold** syntax cleanly into styled elements
function renderFormattedText(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const cleanContent = part.slice(2, -2);
      const isMetric = /[\d%]+/.test(cleanContent);
      return (
        <strong 
          key={i} 
          className={`font-bold ${
            isMetric 
              ? 'text-indigo-900 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/70 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-500/30 font-mono text-[11px]' 
              : 'text-slate-900 dark:text-white font-semibold'
          }`}
        >
          {cleanContent}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function ExecutiveSummaryBanner({ llmSummary = '', filters = {}, totalRecords = 0, kpis = {} }) {
  if (!llmSummary && totalRecords === 0) return null;

  // Split summary into formatted paragraphs
  const paragraphs = (llmSummary || '').split('\n\n').filter(p => p.trim());

  return (
    <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Executive Intelligence Briefing</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Synthesis grounded in active dataset telemetry
            </p>
          </div>
        </div>

        {/* Dynamic Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium">
            <Filter className="w-3 h-3 text-slate-400" />
            <span className="capitalize">{filters.time_period || 'Overall'} View</span>
          </span>
          {filters.year && (
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-medium">
              Year {filters.year}
            </span>
          )}
          {filters.region && (
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
              {filters.region}
            </span>
          )}
        </div>
      </div>

      {/* Structured 3-Card Multi-Paragraph Executive Briefing */}
      {paragraphs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paragraphs.map((para, idx) => {
            let title = 'Operational Service Overview';
            let Icon = Zap;
            let iconBadgeStyle = 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300';

            if (idx === 0) {
              title = 'Operational Service Overview';
              Icon = Zap;
              iconBadgeStyle = 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300';
            } else if (idx === 1) {
              title = 'Friction & Failure Drivers';
              Icon = AlertTriangle;
              iconBadgeStyle = 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300';
            } else {
              title = 'Prioritized Remediation Roadmap';
              Icon = Target;
              iconBadgeStyle = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300';
            }

            return (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                    <span className={`p-1.5 rounded-lg ${iconBadgeStyle}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-white">
                      {title}
                    </h4>
                  </div>
                  
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
                    {para.split('\n').map((line, lIdx) => {
                      const trimmed = line.trim();
                      if (!trimmed) return null;
                      const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
                      return (
                        <div key={lIdx} className={isBullet ? 'flex items-start gap-1.5 pl-1' : ''}>
                          {isBullet && <span className="text-indigo-600 dark:text-indigo-400 font-bold">•</span>}
                          <span>{renderFormattedText(isBullet ? trimmed.replace(/^[•\-]\s*/, '') : trimmed)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          No executive briefing generated for active filters.
        </div>
      )}
    </div>
  );
}

export default ExecutiveSummaryBanner;
