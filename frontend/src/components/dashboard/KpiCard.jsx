import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Clock, CheckCircle2, AlertOctagon, RefreshCcw, ThumbsDown, ShieldAlert, Info } from 'lucide-react';

export function KpiCard({
  title,
  value,
  unit = '',
  delta = null,
  whyChanged = null,
  isPositiveGood = true,
  variant = 'indigo', // 'indigo' | 'emerald' | 'amber' | 'rose' | 'orange' | 'cyan'
  delay = 0,
  onMethodologyClick = null,
}) {
  const [showWhy, setShowWhy] = useState(false);
  const isNoData = value === null || value === undefined;

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
      bg: 'bg-gradient-to-b from-amber-50/40 via-white to-white',
      badgeBg: 'bg-amber-100 text-amber-800',
      icon: Clock,
      valueColor: 'text-amber-950',
    },
    emerald: {
      border: 'border-emerald-200 hover:border-emerald-300',
      bg: 'bg-gradient-to-b from-emerald-50/40 via-white to-white',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      icon: CheckCircle2,
      valueColor: 'text-emerald-950',
    },
    rose: {
      border: 'border-rose-200 hover:border-rose-300',
      bg: 'bg-gradient-to-b from-rose-50/40 via-white to-white',
      badgeBg: 'bg-rose-100 text-rose-800',
      icon: AlertOctagon,
      valueColor: 'text-rose-950',
    },
    orange: {
      border: 'border-orange-200 hover:border-orange-300',
      bg: 'bg-gradient-to-b from-orange-50/40 via-white to-white',
      badgeBg: 'bg-orange-100 text-orange-800',
      icon: RefreshCcw,
      valueColor: 'text-orange-950',
    },
    purple: {
      border: 'border-purple-200 hover:border-purple-300',
      bg: 'bg-gradient-to-b from-purple-50/40 via-white to-white',
      badgeBg: 'bg-purple-100 text-purple-800',
      icon: ThumbsDown,
      valueColor: 'text-purple-950',
    },
    indigo: {
      border: 'border-indigo-200 hover:border-indigo-300',
      bg: 'bg-gradient-to-b from-indigo-50/40 via-white to-white',
      badgeBg: 'bg-indigo-100 text-indigo-800',
      icon: ShieldAlert,
      valueColor: 'text-indigo-950',
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.indigo;
  const CardIcon = currentVariant.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`p-4 rounded-2xl border transition-all shadow-2xs hover:shadow-md flex flex-col justify-between ${
        isNoData
          ? 'bg-slate-50 border-dashed border-slate-300'
          : `${currentVariant.border} ${currentVariant.bg}`
      }`}
    >
      <div>
        {/* Top: Icon */}
        <div className="flex items-center justify-between mb-2">
          <span className={`p-1.5 rounded-lg ${currentVariant.badgeBg} shadow-2xs shrink-0`}>
            <CardIcon className="w-4 h-4" />
          </span>
        </div>

        {/* Title: 100% Full Width, Clean Typography */}
        <h4 className="font-display font-extrabold text-xs text-slate-800 tracking-tight leading-snug mb-1 min-h-[28px] flex items-center">
          {title}
        </h4>

        {/* Metric Value */}
        <div className="flex items-baseline gap-1 my-1">
          {isNoData ? (
            <span className="text-xl font-mono font-bold text-slate-400 tracking-tight">
              N/A
            </span>
          ) : (
            <>
              <span className={`text-2xl sm:text-[28px] font-display font-black tracking-tight ${currentVariant.valueColor}`}>
                {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : value}
              </span>
              {unit && <span className="text-xs font-mono text-slate-500 font-bold">{unit}</span>}
            </>
          )}
        </div>
      </div>

      {/* Delta & Explanation Footer */}
      <div className="mt-2 pt-2 border-t border-slate-100/90">
        <div className="flex items-center justify-between text-[11px] font-mono">
          {isNoData ? (
            <span className="text-[10px] text-slate-400 italic truncate">
              No Data
            </span>
          ) : (
            <>
              {delta !== null && delta !== undefined ? (
                <span className={`inline-flex items-center gap-0.5 font-bold ${trendColor}`}>
                  <TrendIcon className="w-3 h-3" />
                  <span>{delta > 0 ? `+${delta}` : delta}%</span>
                  <span className="text-slate-400 text-[10px] font-normal ml-0.5">vs prev</span>
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold text-[10px]">
                  Active Telemetry
                </span>
              )}

              {whyChanged && (
                <button
                  type="button"
                  onClick={() => setShowWhy(!showWhy)}
                  className="text-[10px] text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-0.5 cursor-pointer font-sans"
                  title={whyChanged}
                >
                  <Info className="w-3 h-3" />
                  <span>{showWhy ? 'hide' : 'why'}</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Expandable Why Explanation */}
        {showWhy && whyChanged && !isNoData && (
          <div className="mt-1.5 p-2 rounded-lg bg-white/95 border border-slate-200 text-[10px] text-slate-700 leading-snug font-sans shadow-xs">
            <strong className="text-slate-900">Insight: </strong>{whyChanged}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default KpiCard;
