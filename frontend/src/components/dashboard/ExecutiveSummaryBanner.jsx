import React from 'react';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Filter, Zap, Target } from 'lucide-react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';

// Helper to parse inline **bold** syntax cleanly into styled elements
function renderFormattedText(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const cleanContent = part.slice(2, -2);
      // Highlight metrics/percentages with a subtle colored badge
      const isMetric = /[\d%]+/.test(cleanContent);
      return (
        <strong 
          key={i} 
          className={`font-bold ${
            isMetric 
              ? 'text-indigo-900 bg-indigo-50/90 px-1.5 py-0.5 rounded border border-indigo-200/70 font-mono text-[11px]' 
              : 'text-slate-900 font-semibold'
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
    <div className="p-6 rounded-2xl bg-gradient-to-br from-white via-indigo-50/20 to-violet-50/20 border border-indigo-100 shadow-sm space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100/70">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-black text-base text-slate-900 tracking-tight flex items-center gap-2">
              <span>Executive Plain-Language Intelligence Briefing</span>
            </h3>
            <p className="text-xs font-mono text-slate-500 font-medium">
              Consolidated voice-of-customer synthesis dynamically grounded in live database telemetry
            </p>
          </div>
        </div>

        {/* Dynamic Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-900 text-xs font-mono font-bold shadow-2xs">
            <Filter className="w-3 h-3 text-indigo-600" />
            <span className="capitalize">{filters.time_period || 'Overall'} View</span>
          </span>
          {filters.year && (
            <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-mono font-bold shadow-2xs">
              Year {filters.year}
            </span>
          )}
          {filters.month && (
            <span className="px-2.5 py-1 rounded-lg bg-violet-600 text-white text-xs font-mono font-bold shadow-2xs">
              Month {filters.month}
            </span>
          )}
          {filters.region && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-mono font-bold">
              {filters.region}
            </span>
          )}
          {filters.product && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-xs font-mono font-bold">
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

            const cardBg = isPerf 
              ? 'bg-gradient-to-b from-emerald-50/60 to-white border-emerald-200/80 shadow-emerald-100/50' 
              : isThemes 
                ? 'bg-gradient-to-b from-rose-50/60 to-white border-rose-200/80 shadow-rose-100/50' 
                : 'bg-gradient-to-b from-indigo-50/60 to-white border-indigo-200/80 shadow-indigo-100/50';

            const headerColor = isPerf ? 'text-emerald-900' : isThemes ? 'text-rose-900' : 'text-indigo-900';
            const iconBadgeBg = isPerf ? 'bg-emerald-600 text-white' : isThemes ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white';

            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${cardBg}`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-slate-200/60">
                    <span className={`p-1 rounded-lg ${iconBadgeBg} shadow-2xs`}>
                      {isPerf && <TrendingUp className="w-3.5 h-3.5" />}
                      {isThemes && <AlertTriangle className="w-3.5 h-3.5" />}
                      {isPlan && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </span>
                    <h4 className={`font-display font-extrabold text-xs tracking-tight ${headerColor}`}>
                      {isPerf ? '1. Operational Service Performance' : isThemes ? '2. Friction Drivers & Failure Modes' : '3. Prioritized Remediation Actions'}
                    </h4>
                  </div>

                  <div className="text-slate-700 space-y-2 text-xs font-sans leading-relaxed">
                    {para.split('\n').map((line, lIdx) => {
                      if (line.startsWith('**') && line.endsWith('**:')) return null;
                      if (line.startsWith('- ')) {
                        return (
                          <div key={lIdx} className="flex items-start gap-2 text-slate-800 font-sans text-xs bg-white/80 p-2 rounded-lg border border-slate-200/60 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                            <span className="leading-snug">{renderFormattedText(line.replace('- ', ''))}</span>
                          </div>
                        );
                      }
                      return (
                        <p key={lIdx} className="leading-relaxed">
                          {renderFormattedText(line)}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 font-mono italic">
          Ingest conversations to generate live grounded executive summary.
        </div>
      )}
    </div>
  );
}

export default ExecutiveSummaryBanner;
