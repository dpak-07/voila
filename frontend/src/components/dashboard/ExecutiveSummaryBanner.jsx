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
    <div className="p-6 rounded-2xl glass-card space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-black text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Executive Plain-Language Intelligence Briefing</span>
            </h3>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">
              Consolidated voice-of-customer synthesis dynamically grounded in live database telemetry
            </p>
          </div>
        </div>

        {/* Dynamic Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold shadow-2xs">
            <Filter className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span className="capitalize">{filters.time_period || 'Overall'} View</span>
          </span>
          {filters.year && (
            <span className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white text-xs font-mono font-bold shadow-2xs">
              Year {filters.year}
            </span>
          )}
          {filters.month && (
            <span className="px-2.5 py-1 rounded-xl bg-violet-600 text-white text-xs font-mono font-bold shadow-2xs">
              Month {filters.month}
            </span>
          )}
          {filters.region && (
            <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold">
              {filters.region}
            </span>
          )}
          {filters.product && (
            <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-mono font-bold">
              {filters.product}
            </span>
          )}
          <ConfidenceBadge confidence="measured" size="sm" />
        </div>
      </div>

      {/* Structured 3-Card Multi-Paragraph Executive Briefing */}
      {paragraphs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {paragraphs.map((para, idx) => {
            const isPerf = para.toLowerCase().includes('operational') || para.toLowerCase().includes('performance') || idx === 0;
            const isThemes = para.toLowerCase().includes('complaint') || para.toLowerCase().includes('root cause') || idx === 1;
            const isPlan = para.toLowerCase().includes('remediation') || para.toLowerCase().includes('plan') || idx === 2;

            const cardStyle = isPerf 
              ? 'border-emerald-200/90 dark:border-emerald-500/25 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs' 
              : isThemes 
                ? 'border-rose-200/90 dark:border-rose-500/25 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs' 
                : 'border-indigo-200/90 dark:border-indigo-500/25 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs';

            const headerColor = isPerf ? 'text-emerald-900 dark:text-emerald-300' : isThemes ? 'text-rose-900 dark:text-rose-300' : 'text-indigo-900 dark:text-indigo-300';
            const iconBadgeBg = isPerf ? 'bg-emerald-600 text-white' : isThemes ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white';

            let title = isPerf 
              ? '1. Operational Service Performance' 
              : isThemes 
                ? '2. Friction Drivers & Failure Modes' 
                : '3. Prioritized Remediation Actions';

            return (
              <motion.div
                key={idx}
                whileHover={{ y: -2 }}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${cardStyle}`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200/60 dark:border-white/10">
                    <span className={`p-1 rounded-lg ${iconBadgeBg} shadow-2xs`}>
                      {isPerf ? <Zap className="w-3.5 h-3.5" /> : isThemes ? <AlertTriangle className="w-3.5 h-3.5" /> : <Target className="w-3.5 h-3.5" />}
                    </span>
                    <h4 className={`font-display font-bold text-xs uppercase tracking-wider ${headerColor}`}>
                      {title}
                    </h4>
                  </div>
                  
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed space-y-2">
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

                <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  <span>Section Verified</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">100% Grounded</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-600 dark:text-slate-300">
          No executive briefing generated for active filters.
        </div>
      )}
    </div>
  );
}

export default ExecutiveSummaryBanner;
