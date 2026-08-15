import React from 'react';
import { Database, AlertTriangle, FileQuestion, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Honest Empty & Diagnostic State
 * Explains exactly what metadata is missing without sugarcoating or pretending.
 */
export function EmptyDiagnostic({
  title = "No Data Available",
  message = "The active dataset does not contain records matching the requested slice.",
  requiredFields = [],
  actionText = null,
  actionLink = null,
  compact = false,
}) {
  if (compact) {
    return (
      <div className="p-4 rounded-lg bg-void-900/60 border border-dashed border-slate-800 text-center hatch-pattern">
        <p className="text-xs font-mono text-slate-400 font-medium">{title}</p>
        <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">{message}</p>
        {requiredFields.length > 0 && (
          <p className="text-[10px] font-mono text-signal-amber mt-2">
            Requires schema columns: [{requiredFields.join(', ')}]
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 rounded-xl bg-void-900/80 border border-dashed border-slate-800/80 text-center hatch-pattern my-3 relative overflow-hidden">
      <div className="w-12 h-12 rounded-xl bg-void-800 border border-slate-700/60 flex items-center justify-center mx-auto mb-3 shadow-inner">
        <FileQuestion className="w-6 h-6 text-slate-400" />
      </div>

      <h4 className="font-display font-semibold text-slate-200 text-base">{title}</h4>
      <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
        {message}
      </p>

      {requiredFields.length > 0 && (
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-void-950 border border-slate-800 text-xs font-mono text-slate-300">
          <span className="text-signal-amber font-semibold">Missing Columns:</span>
          <span>{requiredFields.join(', ')}</span>
        </div>
      )}

      {actionText && actionLink && (
        <div className="mt-5">
          <Link
            to={actionLink}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-signal-emerald/10 text-signal-emerald border border-signal-emerald/30 hover:bg-signal-emerald/20 transition-colors text-xs font-mono font-semibold"
          >
            {actionText}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default EmptyDiagnostic;
