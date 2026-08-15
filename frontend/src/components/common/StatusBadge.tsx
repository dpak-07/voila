import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const norm = status?.toLowerCase() || '';

  let colorClass = 'bg-slate-800 text-slate-300 border-slate-700';
  let icon = <Info className="w-3.5 h-3.5" />;

  if (norm.includes('critical') || norm.includes('fail') || norm.includes('high') || norm.includes('negative')) {
    colorClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    icon = <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
  } else if (norm.includes('medium') || norm.includes('warn') || norm.includes('investigat') || norm.includes('pending')) {
    colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
  } else if (norm.includes('success') || norm.includes('resolved') || norm.includes('positive') || norm.includes('low') || norm.includes('mitigated')) {
    colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    icon = <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
  } else if (norm.includes('running') || norm.includes('progress') || norm.includes('monitor')) {
    colorClass = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    icon = <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" />;
  }

  const py = size === 'sm' ? 'py-0.5 px-2.5 text-xs' : 'py-1 px-3 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${py} ${colorClass}`}>
      {icon}
      <span>{status}</span>
    </span>
  );
};
