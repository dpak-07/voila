import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Repeat, Flame, Clock, TrendingUp, ShieldAlert, Sparkles, Activity } from 'lucide-react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';

export function KpiPillarsGrid({ pillars = {} }) {
  const items = [
    {
      title: 'Emerging Spikes',
      value: pillars.emerging_spikes_count ?? 0,
      unit: 'clusters',
      tag: 'Spike Alert',
      description: 'Velocity anomaly surge across uploads',
      icon: Flame,
      border: 'border-slate-200/90 dark:border-slate-800',
      bg: 'bg-white dark:bg-slate-900',
      badgeBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
      valueColor: 'text-slate-900 dark:text-white',
      tagColor: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      confidence: 'measured',
    },
    {
      title: 'Recurring Friction',
      value: pillars.recurring_issue_count ?? 0,
      unit: 'clusters',
      tag: 'Persistent',
      description: pillars.recurring_issues_reduction ? `${pillars.recurring_issues_reduction}% cross-run reduction` : 'Multi-upload historical issues',
      icon: Repeat,
      border: 'border-slate-200/90 dark:border-slate-800',
      bg: 'bg-white dark:bg-slate-900',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      valueColor: 'text-slate-900 dark:text-white',
      tagColor: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      confidence: 'proxy',
    },
    {
      title: 'Escalation Multiplier',
      value: pillars.sentiment_escalation_multiplier ? `${pillars.sentiment_escalation_multiplier}x` : 'N/A',
      unit: '',
      tag: 'Risk Index',
      description: 'Negative sentiment escalation multiplier',
      icon: Zap,
      border: 'border-slate-200/90 dark:border-slate-800',
      bg: 'bg-white dark:bg-slate-900',
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
      valueColor: 'text-slate-900 dark:text-white',
      tagColor: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      confidence: 'proxy',
    },
    {
      title: 'Response Velocity',
      value: pillars.fast_mean_response_time ? `${pillars.fast_mean_response_time}m` : (pillars.ai_speedup_boost ? `${pillars.ai_speedup_boost}%` : 'N/A'),
      unit: '',
      tag: 'Velocity SLA',
      description: 'Mean triage speedup across channels',
      icon: Clock,
      border: 'border-slate-200/90 dark:border-slate-800',
      bg: 'bg-white dark:bg-slate-900',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-slate-900 dark:text-white',
      tagColor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      confidence: 'measured',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            className={`p-4 rounded-2xl border ${item.border} ${item.bg} shadow-xs flex flex-col justify-between space-y-2`}
          >
            <div>
              {/* Header: Icon + Title + Tag */}
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`p-1.5 rounded-lg ${item.badgeBg} shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.title}>
                    {item.title}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 ${item.tagColor}`}>
                  {item.tag}
                </span>
              </div>

              {/* Metric Value */}
              <div className="flex items-baseline gap-1 my-1">
                <span className={`text-2xl font-bold tracking-tight ${item.valueColor}`}>
                  {item.value}
                </span>
                {item.unit && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-normal ml-0.5">
                    {item.unit}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
              {item.description}
            </p>

            {/* Footer Confidence Badge */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">Confidence</span>
              <ConfidenceBadge confidence={item.confidence} size="sm" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default KpiPillarsGrid;
