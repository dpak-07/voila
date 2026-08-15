import React from 'react';
import { Zap, Repeat, Flame, Clock } from 'lucide-react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';

export function KpiPillarsGrid({ pillars = {} }) {
  const items = [
    {
      title: 'Emerging Spikes',
      value: pillars.emerging_spikes_count ?? 0,
      unit: 'clusters',
      description: 'Z-score > 2.0 velocity anomalies',
      icon: Flame,
      color: 'text-zinc-900',
      bg: 'bg-zinc-100',
      border: 'border-zinc-300',
    },
    {
      title: 'Recurring Friction',
      value: pillars.recurring_issue_count ?? 0,
      unit: 'clusters',
      description: `${pillars.recurring_issues_reduction ? `${pillars.recurring_issues_reduction}% cross-run reduction` : 'Persistent friction across uploads'}`,
      icon: Repeat,
      color: 'text-zinc-900',
      bg: 'bg-zinc-100',
      border: 'border-zinc-300',
    },
    {
      title: 'Escalation Multiplier',
      value: pillars.sentiment_escalation_multiplier ? `${pillars.sentiment_escalation_multiplier}x` : '1.0x',
      unit: '',
      description: 'Negative complaints escalation multiplier',
      icon: Zap,
      color: 'text-zinc-900',
      bg: 'bg-zinc-100',
      border: 'border-zinc-300',
    },
    {
      title: 'Fast Response Velocity',
      value: pillars.fast_mean_response_time ? `${pillars.fast_mean_response_time}m` : (pillars.ai_speedup_boost ? `${pillars.ai_speedup_boost}%` : 'Fast'),
      unit: '',
      description: 'AI automated deflection speedup',
      icon: Clock,
      color: 'text-zinc-900',
      bg: 'bg-zinc-100',
      border: 'border-zinc-300',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            className="p-4 rounded-xl signal-card flex items-start gap-3.5"
          >
            <div className={`p-2.5 rounded-xl ${item.bg} ${item.border} border shrink-0`}>
              <Icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-500 font-bold uppercase tracking-wider truncate">
                  {item.title}
                </span>
              </div>
              <div className="flex items-baseline gap-1 my-0.5">
                <span className="text-xl font-display font-extrabold text-zinc-900">{item.value}</span>
                {item.unit && <span className="text-xs font-mono text-zinc-500 font-semibold">{item.unit}</span>}
              </div>
              <p className="text-[10px] font-mono text-zinc-500 truncate" title={item.description}>
                {item.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default KpiPillarsGrid;
