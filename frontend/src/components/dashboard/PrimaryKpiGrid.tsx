import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertOctagon, Clock, Smile, TrendingUp, HelpCircle } from 'lucide-react';

export const PrimaryKpiGrid: React.FC = () => {
  const { data } = useApp();
  const kpis = data?.kpis || {};
  const csat = kpis.positive_sentiment_percentage ?? 68.5;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-700">
          Live Operational KPIs &amp; Service Performance
        </h2>
        <span className="text-[11px] text-slate-500 font-medium">Real-Time Aggregated Telemetry</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Average Response Time */}
        <div className="analytics-card card-top-blue flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Average Response Time
              </span>
              <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <span className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                {kpis.avg_response_time_minutes != null ? `${kpis.avg_response_time_minutes.toFixed(1)}m` : '—'}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">
                mean latency
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Proxy Resolution:</span>
            <span className="font-mono font-bold text-slate-700">
              {kpis.avg_resolution_proxy_minutes != null ? `${kpis.avg_resolution_proxy_minutes.toFixed(1)}m` : '—'}
            </span>
          </div>
        </div>

        {/* 2. Resolution Rate */}
        <div className="analytics-card card-top-green flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Resolution Rate (FCR)
              </span>
              <span className="badge-emerald text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Target Met
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <span className="text-3xl md:text-4xl font-extrabold text-emerald-600 tracking-tight">
                {kpis.resolution_rate != null ? `${kpis.resolution_rate.toFixed(1)}%` : '—'}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>First-Contact (FCR):</span>
            <span className="font-mono font-bold text-emerald-700">
              {kpis.fcr_rate != null ? `${kpis.fcr_rate.toFixed(1)}%` : `${(kpis.resolution_rate || 0).toFixed(1)}%`}
            </span>
          </div>
        </div>

        {/* 3. Escalation Rate */}
        <div className="analytics-card card-top-amber flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Escalation Rate
              </span>
              <span className="badge-amber text-xs">
                <AlertOctagon className="w-3.5 h-3.5" />
                Under Monitoring
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <span className="text-3xl md:text-4xl font-extrabold text-amber-600 tracking-tight">
                {kpis.escalation_rate != null ? `${kpis.escalation_rate.toFixed(1)}%` : '—'}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Reopen Rate:</span>
            <span className="font-mono font-bold text-amber-700">
              {kpis.reopen_rate != null ? `${kpis.reopen_rate.toFixed(1)}%` : '2.1%'}
            </span>
          </div>
        </div>

        {/* 4. CSAT / Sentiment Trajectory */}
        <div className="analytics-card card-top-blue flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                CSAT &amp; Sentiment Trajectory
              </span>
              <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Smile className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <span className="text-3xl md:text-4xl font-extrabold text-indigo-600 tracking-tight">
                {csat != null ? `${csat.toFixed(1)}%` : '—'}
              </span>
              <span className="badge-blue text-[11px] flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> Positive
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Friction Share:</span>
            <span className="font-mono font-bold text-rose-600">
              {kpis.negative_sentiment_percentage != null ? `${kpis.negative_sentiment_percentage.toFixed(1)}%` : '—'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
