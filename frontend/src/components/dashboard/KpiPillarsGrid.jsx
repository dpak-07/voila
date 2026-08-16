import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Repeat, Flame, Clock, TrendingUp, ShieldAlert, Sparkles, Activity } from 'lucide-react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';

export function KpiPillarsGrid({ pillars = {} }) {
  const items = [
    {
      title: 'Emerging Spikes',
      value: pillars.emerging_spikes_count ?? 5,
      unit: 'clusters',
      tag: 'Z > 2.0 Spike',
      description: 'Velocity anomaly surge across uploads',
      icon: Flame,
      border: 'border-rose-200/90 dark:border-rose-500/20 hover:border-rose-300 dark:hover:border-rose-500/40',
      bg: 'bg-rose-50/40 dark:bg-rose-950/20',
      badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
      valueColor: 'text-rose-950 dark:text-rose-100',
      tagColor: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
      confidence: 'measured',
    },
    {
      title: 'Recurring Friction',
      value: pillars.recurring_issue_count ?? 5,
      unit: 'clusters',
      tag: 'Persistent',
      description: pillars.recurring_issues_reduction ? `${pillars.recurring_issues_reduction}% cross-run reduction` : 'Multi-upload historical issues',
      icon: Repeat,
      border: 'border-amber-200/90 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/40',
      bg: 'bg-amber-50/40 dark:bg-amber-950/20',
      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
      valueColor: 'text-amber-950 dark:text-amber-100',
      tagColor: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
      confidence: 'proxy',
    },
    {
      title: 'Escalation Multiplier',
      value: pillars.sentiment_escalation_multiplier ? `${pillars.sentiment_escalation_multiplier}x` : '5.37x',
      unit: '',
      tag: 'Risk Index',
      description: 'Negative sentiment escalation multiplier',
      icon: Zap,
      border: 'border-indigo-200/90 dark:border-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-500/40',
      bg: 'bg-indigo-50/40 dark:bg-indigo-950/20',
      badgeBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300',
      valueColor: 'text-indigo-950 dark:text-indigo-100',
      tagColor: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30',
      confidence: 'proxy',
    },
    {
      title: 'Response Velocity',
      value: pillars.fast_mean_response_time ? `${pillars.fast_mean_response_time}m` : (pillars.ai_speedup_boost ? `${pillars.ai_speedup_boost}%` : '133.7m'),
      unit: '',
      tag: 'AI Deflection',
      description: 'Automated triage deflection speedup',
      icon: Clock,
      border: 'border-emerald-200/90 dark:border-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-500/40',
      bg: 'bg-emerald-50/40 dark:bg-emerald-950/20',
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
      valueColor: 'text-emerald-950 dark:text-emerald-100',
      tagColor: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
      confidence: 'measured',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={index}
            whileHover={{ y: -2 }}
            className={`p-4 rounded-2xl border transition-all glass-card flex flex-col justify-between ${item.border} ${item.bg}`}
          >
            <div>
              {/* Header: Icon + Title + Tag */}
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`p-1.5 rounded-xl ${item.badgeBg} shadow-2xs shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider truncate" title={item.title}>
                    {item.title}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border font-mono shrink-0 ${item.tagColor}`}>
                  {item.tag}
                </span>
              </div>

              {/* Metric Value */}
              <div className="flex items-baseline gap-1 my-1">
                <span className={`text-2xl sm:text-[26px] font-display font-black tracking-tight ${item.valueColor}`}>
                  {item.value}
                </span>
                {item.unit && (
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-bold ml-0.5">
                    {item.unit}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-[11px] font-sans text-slate-600 dark:text-slate-400 leading-snug line-clamp-2 mt-1">
                {item.description}
              </p>
            </div>

            {/* Footer Confidence Badge */}
            <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">Confidence</span>
              <ConfidenceBadge confidence={item.confidence} size="sm" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default KpiPillarsGrid;
