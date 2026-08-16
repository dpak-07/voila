import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, CheckCircle2, AlertOctagon, RefreshCcw, ThumbsDown, ShieldAlert, Info, X } from 'lucide-react';
import { AnimatedNumber } from '../common/AnimatedNumber';

export function KpiCard({
  title,
  value,
  unit = '',
  delta = null,
  isPositiveGood = true,
  variant = 'indigo',
  why = '',
  delay = 0,
  isNoData = false,
}) {
  const [showWhyModal, setShowWhyModal] = useState(false);

  // Compute delta styling & trend
  let TrendIcon = TrendingUp;
  let trendColor = 'text-slate-500 dark:text-slate-400';
  let formattedDelta = '0.0%';

  if (delta !== null && delta !== undefined) {
    const numericDelta = typeof delta === 'number' ? delta : parseFloat(delta) || 0;
    formattedDelta = `${numericDelta >= 0 ? '+' : ''}${numericDelta.toFixed(1)}%`;

    if (numericDelta >= 0) {
      TrendIcon = TrendingUp;
      trendColor = isPositiveGood ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-rose-700 dark:text-rose-400 font-bold';
    } else {
      TrendIcon = TrendingDown;
      trendColor = isPositiveGood ? 'text-rose-700 dark:text-rose-400 font-bold' : 'text-emerald-700 dark:text-emerald-400 font-bold';
    }
  }

  // Dual adaptive light/dark glass presets with high contrast & tactile ambient tints
  const variantStyles = {
    amber: {
      border: 'border-amber-200/90 dark:border-amber-500/20 hover:border-amber-400 dark:hover:border-amber-500/40',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
      tint: 'bg-gradient-to-br from-amber-500/[0.06] via-transparent to-transparent',
      glow: 'shadow-md shadow-amber-500/5 dark:shadow-[0_0_20px_rgba(245,158,11,0.08)]',
      icon: Clock,
      valueColor: 'text-amber-950 dark:text-amber-100',
    },
    emerald: {
      border: 'border-emerald-200/90 dark:border-emerald-500/20 hover:border-emerald-400 dark:hover:border-emerald-500/40',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
      tint: 'bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-transparent',
      glow: 'shadow-md shadow-emerald-500/5 dark:shadow-[0_0_20px_rgba(16,185,129,0.08)]',
      icon: CheckCircle2,
      valueColor: 'text-emerald-950 dark:text-emerald-100',
    },
    rose: {
      border: 'border-rose-200/90 dark:border-rose-500/20 hover:border-rose-400 dark:hover:border-rose-500/40',
      badgeBg: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
      tint: 'bg-gradient-to-br from-rose-500/[0.06] via-transparent to-transparent',
      glow: 'shadow-md shadow-rose-500/5 dark:shadow-[0_0_20px_rgba(244,63,94,0.08)]',
      icon: AlertOctagon,
      valueColor: 'text-rose-950 dark:text-rose-100',
    },
    orange: {
      border: 'border-orange-200/90 dark:border-orange-500/20 hover:border-orange-400 dark:hover:border-orange-500/40',
      badgeBg: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30',
      tint: 'bg-gradient-to-br from-orange-500/[0.06] via-transparent to-transparent',
      glow: 'shadow-md shadow-orange-500/5 dark:shadow-[0_0_20px_rgba(249,115,22,0.08)]',
      icon: RefreshCcw,
      valueColor: 'text-orange-950 dark:text-orange-100',
    },
    purple: {
      border: 'border-purple-200/90 dark:border-purple-500/20 hover:border-purple-400 dark:hover:border-purple-500/40',
      badgeBg: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30',
      tint: 'bg-gradient-to-br from-purple-500/[0.06] via-transparent to-transparent',
      glow: 'shadow-md shadow-purple-500/5 dark:shadow-[0_0_20px_rgba(168,85,247,0.08)]',
      icon: ThumbsDown,
      valueColor: 'text-purple-950 dark:text-purple-100',
    },
    indigo: {
      border: 'border-indigo-200/90 dark:border-indigo-500/20 hover:border-indigo-400 dark:hover:border-indigo-500/40',
      badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30',
      tint: 'bg-gradient-to-br from-indigo-500/[0.06] via-transparent to-transparent',
      glow: 'shadow-md shadow-indigo-500/5 dark:shadow-[0_0_20px_rgba(99,102,241,0.08)]',
      icon: ShieldAlert,
      valueColor: 'text-indigo-950 dark:text-indigo-100',
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.indigo;
  const CardIcon = currentVariant.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={`p-4 sm:p-5 rounded-3xl border glass-card glass-card-hover flex flex-col justify-between relative overflow-hidden ${currentVariant.border} ${currentVariant.glow}`}
    >
      {/* Subtle Tint Sheen */}
      <div className={`absolute inset-0 ${currentVariant.tint} pointer-events-none`} />

      {/* Decorative Watermark Corner Icon */}
      <CardIcon className="w-20 h-20 absolute -top-3 -right-3 text-slate-900/[0.03] dark:text-white/[0.03] pointer-events-none stroke-[1]" />

      <div className="relative z-10">
        {/* Top: Icon Badge */}
        <div className="flex items-center justify-between mb-2.5">
          <span className={`p-2.5 rounded-2xl border ${currentVariant.badgeBg} shadow-2xs shrink-0`}>
            <CardIcon className="w-4 h-4" />
          </span>
        </div>

        {/* Title: Full Width, Clean Typography */}
        <h4 className="font-display font-semibold text-xs text-slate-700 dark:text-slate-300 tracking-tight leading-snug mb-1 min-h-[26px] flex items-center">
          {title}
        </h4>

        {/* Metric Value */}
        <div className="flex items-baseline gap-1 my-1">
          {isNoData ? (
            <span className="text-xl font-mono font-bold text-slate-400 dark:text-slate-500 tracking-tight">
              N/A
            </span>
          ) : (
            <>
              <span className={`text-2xl sm:text-[28px] font-display font-black tracking-tight ${currentVariant.valueColor}`}>
                {typeof value === 'number' ? (
                  <AnimatedNumber 
                    value={value} 
                    decimals={Number.isInteger(value) ? 0 : 1} 
                    duration={2.2} 
                  />
                ) : (
                  value
                )}
              </span>
              {unit && <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-bold">{unit}</span>}
            </>
          )}
        </div>
      </div>

      {/* Delta & Explanation Footer */}
      <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-white/[0.08] relative z-10">
        <div className="flex items-center justify-between text-[11px] font-mono">
          {isNoData ? (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 italic truncate">
              No Data
            </span>
          ) : (
            <>
              {delta !== null && delta !== undefined ? (
                <span className={`inline-flex items-center gap-0.5 font-bold ${trendColor}`}>
                  <TrendIcon className="w-3 h-3" />
                  <span>{formattedDelta}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal ml-0.5">vs prev</span>
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  Baseline
                </span>
              )}
            </>
          )}

          {/* Context Explainer Trigger Button */}
          {why && (
            <button
              onClick={() => setShowWhyModal(true)}
              className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors p-0.5 rounded cursor-pointer"
              title="Inspect Root Driver Context"
            >
              <Info className="w-3 h-3" />
              <span>why</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Context Explainer Modal */}
      <AnimatePresence>
        {showWhyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 rounded-3xl max-w-sm w-full shadow-2xl text-left space-y-3 font-sans text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2">
                <span className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <CardIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  {title} Metric Driver
                </span>
                <button
                  onClick={() => setShowWhyModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                {why}
              </p>

              <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex justify-end">
                <button
                  onClick={() => setShowWhyModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs cursor-pointer shadow-xs"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default KpiCard;
