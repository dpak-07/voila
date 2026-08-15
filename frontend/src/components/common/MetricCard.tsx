import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Sparkles } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  isPositiveGood?: boolean;
  icon?: React.ReactNode;
  subtitle?: string;
  accentColor?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'purple' | 'teal';
  progress?: number; // 0 to 100 for gauge bar
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  change,
  changeLabel = 'vs previous',
  isPositiveGood = true,
  icon,
  subtitle,
  accentColor = 'indigo',
  progress,
  onClick,
}) => {
  const getAccentBorder = () => {
    switch (accentColor) {
      case 'emerald': return 'border-emerald-500/20 hover:border-emerald-500/50 hover:shadow-glow-emerald';
      case 'amber': return 'border-amber-500/20 hover:border-amber-500/50 hover:shadow-glow-amber';
      case 'rose': return 'border-rose-500/20 hover:border-rose-500/50 hover:shadow-glow-rose';
      case 'cyan': return 'border-cyan-500/20 hover:border-cyan-500/50 hover:shadow-glow-cyan';
      case 'purple': return 'border-purple-500/20 hover:border-purple-500/50';
      case 'teal': return 'border-teal-500/20 hover:border-teal-500/50';
      default: return 'border-indigo-500/20 hover:border-indigo-500/50 hover:shadow-glow-primary';
    }
  };

  const getTopBarColor = () => {
    switch (accentColor) {
      case 'emerald': return 'from-emerald-500 to-teal-400';
      case 'amber': return 'from-amber-500 to-yellow-400';
      case 'rose': return 'from-rose-500 to-pink-500';
      case 'cyan': return 'from-cyan-400 to-blue-500';
      case 'purple': return 'from-purple-500 to-indigo-500';
      case 'teal': return 'from-teal-400 to-emerald-500';
      default: return 'from-indigo-500 to-cyan-400';
    }
  };

  const isUp = change !== undefined && change > 0;
  const isDown = change !== undefined && change < 0;
  const isNeutral = change !== undefined && change === 0;

  // Determine if change direction is positive
  const isGood = isPositiveGood ? isUp : isDown;

  return (
    <div
      onClick={onClick}
      className={`group relative bg-obsidian-850/90 backdrop-blur-xl border rounded-2xl p-4 md:p-4.5 transition-all duration-300 shadow-md ${getAccentBorder()} overflow-hidden ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Top Accent Gradient Bar */}
      <div className={`absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r ${getTopBarColor()} opacity-80 group-hover:opacity-100 transition-opacity`} />

      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 leading-tight">
          {title}
        </span>
        {icon && (
          <div className="p-1.5 rounded-lg bg-surface-100/90 border border-surface-border text-slate-300 group-hover:text-white transition-colors">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-sans">
          {value}
        </span>
        {unit && <span className="text-xs font-bold text-slate-400 font-mono">{unit}</span>}
      </div>

      {/* Change Delta Badge & Subtitle */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-surface-border/50">
        {change !== undefined ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                isNeutral
                  ? 'bg-slate-800 text-slate-400'
                  : isGood
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
              }`}
            >
              {isUp && <ArrowUpRight className="w-3 h-3" />}
              {isDown && <ArrowDownRight className="w-3 h-3" />}
              {isNeutral && <Minus className="w-3 h-3" />}
              {Math.abs(change)}%
            </span>
            <span className="text-[10px] text-slate-400 truncate font-medium">{changeLabel}</span>
          </div>
        ) : subtitle ? (
          <span className="text-[11px] text-slate-400 truncate">{subtitle}</span>
        ) : null}

        {progress !== undefined && (
          <span className="text-[10px] font-mono font-bold text-slate-400">{progress}%</span>
        )}
      </div>

      {/* Progress Bar if supplied */}
      {progress !== undefined && (
        <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mt-2">
          <div
            className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${getTopBarColor()}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
};
