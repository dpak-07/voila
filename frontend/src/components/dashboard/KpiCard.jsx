import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Clock, CheckCircle2, AlertOctagon, RefreshCcw, ThumbsDown, ShieldAlert } from 'lucide-react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';

export function KpiCard({
  title,
  value,
  unit = '',
  confidence = 'measured',
  sampleSize = null,
  missingReason = null,
  delta = null,
  isPositiveGood = true,
  description = null,
  variant = 'indigo', // 'indigo' | 'emerald' | 'amber' | 'rose' | 'orange' | 'cyan'
  delay = 0,
}) {
  const isNoData = confidence === 'no_data_available' || value === null || value === undefined;

  // Determine trend color
  let trendColor = 'text-slate-500';
  let TrendIcon = Minus;

  if (delta !== null && delta !== undefined) {
    if (delta > 0) {
      TrendIcon = TrendingUp;
      trendColor = isPositiveGood ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold';
    } else if (delta < 0) {
      TrendIcon = TrendingDown;
      trendColor = isPositiveGood ? 'text-rose-700 font-bold' : 'text-emerald-700 font-bold';
    }
  }

  // Variant styling presets
  const variantStyles = {
    amber: {
      border: 'border-amber-200 hover:border-amber-300',
      bg: 'bg-gradient-to-b from-amber-50/50 via-white to-white',
      badgeBg: 'bg-amber-100 text-amber-800',
      icon: Clock,
      valueColor: 'text-amber-950',
    },
    emerald: {
      border: 'border-emerald-200 hover:border-emerald-300',
      bg: 'bg-gradient-to-b from-emerald-50/50 via-white to-white',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      icon: CheckCircle2,
      valueColor: 'text-emerald-950',
    },
    rose: {
      border: 'border-rose-200 hover:border-rose-300',
      bg: 'bg-gradient-to-b from-rose-50/50 via-white to-white',
      badgeBg: 'bg-rose-100 text-rose-800',
      icon: AlertOctagon,
      valueColor: 'text-rose-950',
    },
    orange: {
      border: 'border-orange-200 hover:border-orange-300',
      bg: 'bg-gradient-to-b from-orange-50/50 via-white to-white',
      badgeBg: 'bg-orange-100 text-orange-800',
      icon: RefreshCcw,
      valueColor: 'text-orange-950',
    },
    purple: {
      border: 'border-purple-200 hover:border-purple-300',
      bg: 'bg-gradient-to-b from-purple-50/50 via-white to-white',
      badgeBg: 'bg-purple-100 text-purple-800',
      icon: ThumbsDown,
      valueColor: 'text-purple-950',
    },
    indigo: {
      border: 'border-indigo-200 hover:border-indigo-300',
      bg: 'bg-gradient-to-b from-indigo-50/50 via-white to-white',
      badgeBg: 'bg-indigo-100 text-indigo-800',
      icon: ShieldAlert,
      valueColor: 'text-indigo-950',
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.indigo;
  const CardIcon = currentVariant.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={`p-5 rounded-2xl border transition-all shadow-xs hover:shadow-md ${
        isNoData
          ? 'bg-slate-50 border-dashed border-slate-300'
          : `${currentVariant.border} ${currentVariant.bg}`
      }`}
    >
      {/* Top: Title & Confidence Anchor */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className={`p-1.5 rounded-lg ${currentVariant.badgeBg} shadow-2xs`}>
            <CardIcon className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
            {title}
          </span>
        </div>
        <ConfidenceBadge
          confidence={confidence}
          sampleSize={sampleSize}
          missingReason={missingReason}
          size="sm"
        />
      </div>

      {/* Metric Value */}
      <div className="flex items-baseline gap-1.5 my-1.5">
        {isNoData ? (
          <span className="text-2xl font-mono font-bold text-slate-400 tracking-tight">
            N/A
          </span>
        ) : (
          <>
            <span className={`text-3xl font-display font-black tracking-tight ${currentVariant.valueColor}`}>
              {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : value}
            </span>
            {unit && <span className="text-sm font-mono text-slate-500 font-bold">{unit}</span>}
          </>
        )}
      </div>

      {/* Delta & Description Footer */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
        {isNoData ? (
          <span className="text-[11px] text-slate-400 italic">
            {missingReason || 'Missing required schema fields'}
          </span>
        ) : (
          <>
            {delta !== null && delta !== undefined ? (
              <span className={`inline-flex items-center gap-1 font-semibold ${trendColor}`}>
                <TrendIcon className="w-3.5 h-3.5" />
                <span>{delta > 0 ? `+${delta}` : delta}%</span>
                <span className="text-slate-400 text-[10px] font-normal">vs prev</span>
              </span>
            ) : (
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200">
                Live Measured
              </span>
            )}
            {description && (
              <span className="text-[11px] text-slate-500 truncate max-w-[130px] font-medium" title={description}>
                {description}
              </span>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

export default KpiCard;
