import React from 'react';
import { ShieldCheck, Activity, AlertCircle, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Signature Element: Signal Resonance Anchor (Data Confidence Indicator)
 * Visibly distinguishes measured, estimated_sampled, and no_data_available
 * wherever numbers or claims appear in Voila.
 */
export function ConfidenceBadge({ 
  confidence = 'measured', 
  sampleSize = null,
  missingReason = null,
  size = 'md',
  showLabel = true 
}) {
  const normConf = (confidence || 'measured').toLowerCase();

  if (normConf === 'measured') {
    return (
      <div 
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md signal-badge-measured font-mono text-[11px] uppercase tracking-wider font-semibold"
        title={sampleSize ? `100% Measured across ${sampleSize.toLocaleString()} records` : 'Verified database computation'}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-emerald opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-signal-emerald"></span>
        </span>
        {showLabel && (
          <span>
            Measured {sampleSize ? `· N=${sampleSize.toLocaleString()}` : ''}
          </span>
        )}
      </div>
    );
  }

  if (normConf === 'estimated_sampled' || normConf === 'estimated') {
    return (
      <div 
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md signal-badge-estimated font-mono text-[11px] uppercase tracking-wider font-semibold"
        title="Statistically sampled estimation (proxy bounds applied)"
      >
        <Activity className="w-3.5 h-3.5 text-signal-amber animate-pulse" />
        {showLabel && (
          <span>
            Estimated {sampleSize ? `· N=${sampleSize.toLocaleString()}` : 'Sampled'}
          </span>
        )}
      </div>
    );
  }

  // No data available
  return (
    <div 
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md signal-badge-nodata font-mono text-[11px] uppercase tracking-wider"
      title={missingReason || 'Required metadata is not present in the current dataset'}
    >
      <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
      {showLabel && (
        <span>
          No Data {missingReason ? `· ${missingReason}` : '· Missing'}
        </span>
      )}
    </div>
  );
}

export default ConfidenceBadge;
