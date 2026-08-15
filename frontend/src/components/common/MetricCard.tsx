import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  isPositiveGood?: boolean;
  icon?: React.ReactNode;
  subtitle?: string;
  accentColor?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'purple';
  progress?: number; // 0 to 100 for gauge bar
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  change,
  changeLabel = 'vs last period',
  isPositiveGood = true,
  icon,
  subtitle,
  accentColor = 'indigo',
  progress,
}) => {
  const getAccentBorder = () => {
    switch (accentColor) {
      case 'emerald': return 'border-emerald-500/20 hover:border-emerald-500/50 group-hover:shadow-glow-emerald';
      case 'amber': return 'border-amber-500/20 hover:border-amber-500/50';
      case 'rose': return 'border-rose-500/20 hover:border-rose-500/50 group-hover:shadow-glow-rose';
      case 'cyan': return 'border-cyan-500/20 hover:border-cyan-500/50 group-hover:shadow-glow-cyan';
      case 'purple': return 'border-purple-500/20 hover:border-purple-500/50';
      default: return 'border-indigo-500/20 hover:border-indigo-500/50 group-hover:shadow-glow-primary';
    }
  };

  const getTopBarColor = () => {
    switch (accentColor) {
      case 'emerald': return 'bg-emerald-500';
      case 'amber': return 'bg-amber-500';
      case 'rose': return 'bg-rose-500';
      case 'cyan': return 'bg-cyan-500';
      case 'purple': return 'bg-purple-500';
      default: return 'bg-indigo-500';
    }
  };

  const isUp = change !== undefined && change > 0;
  const isDown = change !== undefined && change < 0;
  const isNeutral = change !== undefined && change === 0;

  // determine if change is favorable
  const isGood = isPositiveGood ? isUp : isDown;

  return (
    <div className={`group relative bg-surface-card/90 backdrop-blur-xl border rounded-xl p-4 md:p-5 transition-all duration-300 shadow-md ${getAccentBorder()} overflow-hidden`}>
      {/* Top Accent Line */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${getTopBarColor()} opacity-80 group-hover:opacity-100 transition-opacity`} />

      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {icon && (
          <div className="p-2 rounded-lg bg-surface-100/80 text-slate-300 group-hover:text-white transition-colors">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          {value}
        </span>
        {unit && <span className="text-sm font-semibold text-slate-400">{unit}</span>}
      </div>

      {/* Change Delta Badge & Subtitle */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-surface-border/40">
        {change !== undefined ? (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${
                isNeutral
                  ? 'bg-slate-800 text-slate-400'
                  : isGood
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {isUp && <ArrowUpRight className="w-3 h-3" />}
              {isDown && <ArrowDownRight className="w-3 h-3" />}
              {isNeutral && <Minus className="w-3 h-3" />}
              {Math.abs(change)}%
            </span>
            <span className="text-[11px] text-slate-400 truncate">{changeLabel}</span>
          </div>
        ) : subtitle ? (
          <span className="text-xs text-slate-400 truncate">{subtitle}</span>
        ) : null}

        {progress !== undefined && (
          <span className="text-[11px] font-mono text-slate-400">{progress}%</span>
        )}
      </div>

      {/* Progress Bar if supplied */}
      {progress !== undefined && (
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getTopBarColor()}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
};
