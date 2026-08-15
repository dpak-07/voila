import React from 'react';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../common/MetricCard';
import {
  MessageSquare,
  CheckCircle2,
  AlertOctagon,
  RotateCcw,
  Clock,
  ThumbsDown,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

export const OperationalKpis: React.FC = () => {
  const { data } = useApp();
  const kpis = data?.kpis || {};

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-300">
          Service Operations KPI Matrix
        </h3>
        <span className="text-xs text-slate-500 font-mono">15 Standard Metrics Active</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 md:gap-4">
        <MetricCard
          title="Total Conversations"
          value={kpis.total_conversations?.toLocaleString() || '14,850'}
          change={4.6}
          changeLabel="vs last period"
          isPositiveGood={true}
          icon={<MessageSquare className="w-4 h-4 text-cyan-400" />}
          accentColor="cyan"
        />

        <MetricCard
          title="Resolution Rate"
          value={kpis.resolution_rate ? `${kpis.resolution_rate.toFixed(1)}%` : '89.4%'}
          change={3.2}
          changeLabel="efficiency gain"
          isPositiveGood={true}
          progress={kpis.resolution_rate || 89.4}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          accentColor="emerald"
        />

        <MetricCard
          title="Escalation Rate"
          value={kpis.escalation_rate ? `${kpis.escalation_rate.toFixed(1)}%` : '7.8%'}
          change={-1.6}
          changeLabel="drop in escalations"
          isPositiveGood={false}
          progress={kpis.escalation_rate || 7.8}
          icon={<AlertOctagon className="w-4 h-4 text-amber-400" />}
          accentColor="amber"
        />

        <MetricCard
          title="Reopen Rate"
          value={kpis.reopen_rate ? `${kpis.reopen_rate.toFixed(1)}%` : '4.2%'}
          change={-0.8}
          changeLabel="fewer repeat issues"
          isPositiveGood={false}
          progress={kpis.reopen_rate || 4.2}
          icon={<RotateCcw className="w-4 h-4 text-rose-400" />}
          accentColor="rose"
        />

        <MetricCard
          title="Avg Response Time"
          value={kpis.avg_response_time_minutes ? `${kpis.avg_response_time_minutes.toFixed(1)}` : '18.5'}
          unit="min"
          change={-11.9}
          changeLabel="faster response"
          isPositiveGood={false}
          icon={<Clock className="w-4 h-4 text-indigo-400" />}
          accentColor="indigo"
        />

        <MetricCard
          title="Negative Sentiment"
          value={kpis.negative_sentiment_percentage ? `${kpis.negative_sentiment_percentage.toFixed(1)}%` : '21.4%'}
          change={-4.8}
          changeLabel="lower friction"
          isPositiveGood={false}
          progress={kpis.negative_sentiment_percentage || 21.4}
          icon={<ThumbsDown className="w-4 h-4 text-rose-400" />}
          accentColor="rose"
        />

        <MetricCard
          title="First Contact Resolution (FCR)"
          value={kpis.first_contact_resolution_rate ? `${kpis.first_contact_resolution_rate.toFixed(1)}%` : '74.2%'}
          change={2.1}
          changeLabel="one-touch fixes"
          isPositiveGood={true}
          progress={kpis.first_contact_resolution_rate || 74.2}
          icon={<Sparkles className="w-4 h-4 text-cyan-400" />}
          accentColor="cyan"
        />

        <MetricCard
          title="SLA Breach Rate"
          value={kpis.sla_breach_rate ? `${kpis.sla_breach_rate.toFixed(1)}%` : '3.1%'}
          change={-0.9}
          changeLabel="strict compliance"
          isPositiveGood={false}
          progress={kpis.sla_breach_rate || 3.1}
          icon={<ShieldAlert className="w-4 h-4 text-emerald-400" />}
          accentColor="emerald"
        />
      </div>
    </section>
  );
};
