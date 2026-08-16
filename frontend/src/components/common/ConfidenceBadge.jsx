import React from 'react';
import { ShieldCheck, Activity, AlertCircle, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Signature Element: Signal Resonance Anchor (Data Confidence Indicator)
 * Visibly distinguishes measured, proxy, estimated_sampled, and no_data_available
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
  const isSmall = size === 'sm';

  const labelSuffix = isSmall ? '' : sampleSize ? ` · N=${sampleSize.toLocaleString()}` : '';

  if (normConf === 'measured') {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md signal-badge-measured font-mono ${
          isSmall ? 'text-[9px]' : 'text-[11px]'
        } uppercase tracking-wider font-bold select-none cursor-default`}
        title={sampleSize ? `100% Measured across ${sampleSize.toLocaleString()} records` : 'Verified database computation'}
      >
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-emerald opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-signal-emerald"></span>
        </span>
        {showLabel && <span>Measured{labelSuffix}</span>}
      </div>
    );
  }

  if (normConf === 'proxy') {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono ${
          isSmall ? 'text-[9px]' : 'text-[11px]'
        } uppercase tracking-wider font-bold select-none cursor-help`}
        title={sampleSize ? `Derived proxy metric computed across ${sampleSize.toLocaleString()} records via NLP classification` : 'Derived proxy metric'}
      >
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-600"></span>
        </span>
        {showLabel && <span>Proxy{labelSuffix}</span>}
      </div>
    );
  }

  if (normConf === 'estimated_sampled' || normConf === 'estimated') {
    return (
      <div 
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-mono ${
          isSmall ? 'text-[9px]' : 'text-[11px]'
        } uppercase tracking-wider font-bold select-none`}
        title={sampleSize ? `Sampled estimation on ${sampleSize.toLocaleString()} records` : 'Statistically sampled estimation'}
      >
        <Activity className="w-3 h-3 text-amber-600 animate-pulse shrink-0" />
        {showLabel && <span>Estimated{labelSuffix}</span>}
      </div>
    );
  }

  // No data available
  return (
    <div 
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-mono ${
        isSmall ? 'text-[9px]' : 'text-[11px]'
      } uppercase tracking-wider select-none`}
      title={missingReason || 'Required metadata is not present in the current dataset'}
    >
      <AlertCircle className="w-3 h-3 text-slate-400 shrink-0" />
      {showLabel && <span>No Data</span>}
    </div>
  );
}

export default ConfidenceBadge;
