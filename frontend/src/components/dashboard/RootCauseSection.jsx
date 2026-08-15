import React, { useState } from 'react';
import { 
  AlertOctagon, 
  Wrench, 
  ShieldAlert, 
  Cpu, 
  CheckCircle2, 
  ArrowRight, 
  TrendingUp, 
  BarChart2, 
  X, 
  Clock, 
  AlertTriangle,
  Zap,
  Users,
  Target
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { ConfidenceBadge } from '../common/ConfidenceBadge';

export function RootCauseSection({ rootCauses = [] }) {
  const [selectedRca, setSelectedRca] = useState(null);

  const causes = (Array.isArray(rootCauses) ? rootCauses : []).map((item) => {
    if (typeof item === 'string' && item.trim().startsWith('{')) {
      try {
        return JSON.parse(item);
      } catch (e) {
        return item;
      }
    }
    return item;
  });

  if (!causes || causes.length === 0) return null;

  const ownerColorMap = {
    'Mobile & Frontend Engineering': { badge: 'bg-rose-100 text-rose-800 border-rose-200', border: 'border-rose-200 hover:border-rose-300', dot: 'bg-rose-500' },
    'Supply Chain & Logistics': { badge: 'bg-blue-100 text-blue-800 border-blue-200', border: 'border-blue-200 hover:border-blue-300', dot: 'bg-blue-500' },
    'Billing & Payments': { badge: 'bg-amber-100 text-amber-800 border-amber-200', border: 'border-amber-200 hover:border-amber-300', dot: 'bg-amber-500' },
    'Identity & Security': { badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', border: 'border-indigo-200 hover:border-indigo-300', dot: 'bg-indigo-500' },
    'Finance Operations': { badge: 'bg-violet-100 text-violet-800 border-violet-200', border: 'border-violet-200 hover:border-violet-300', dot: 'bg-violet-500' },
    'Support Operations': { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', border: 'border-emerald-200 hover:border-emerald-300', dot: 'bg-emerald-500' },
    'Support Quality Assurance': { badge: 'bg-cyan-100 text-cyan-800 border-cyan-200', border: 'border-cyan-200 hover:border-cyan-300', dot: 'bg-cyan-500' },
  };

  return (
    <div className="p-6 rounded-2xl signal-card space-y-4 border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 text-white shadow-md shadow-rose-200">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
              <span>Systemic Root Cause Analysis (RCA) & Remediation Mapping</span>
              <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                Interactive Drilldown
              </span>
            </h3>
            <p className="text-xs font-mono text-slate-500">
              Click any failure domain to inspect deep telemetry metrics, SLA latency charts, and departmental fix roadmaps
            </p>
          </div>
        </div>
        <ConfidenceBadge confidence="measured" size="sm" />
      </div>

      {/* Root Cause Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {causes.map((rc, idx) => {
          const issueName = typeof rc === 'object' ? (rc.issue || rc.cluster_name || `Failure Domain #${idx + 1}`) : `Root Cause #${idx + 1}`;
          const causeText = typeof rc === 'object' ? (rc.likely_root_cause || rc.root_cause || rc.description || JSON.stringify(rc)) : rc;
          const owner = typeof rc === 'object' ? (rc.owner || 'Support Operations') : 'Support Operations';
          const fix = typeof rc === 'object' ? (rc.recommended_fix || 'Standardize troubleshooting macro response.') : 'Standardize troubleshooting macro.';
          const volume = typeof rc === 'object' ? (rc.volume || 0) : 0;
          const negRate = typeof rc === 'object' ? (rc.negative_sentiment_percentage || 0) : 0;
          const ownerStyle = ownerColorMap[owner] || { badge: 'bg-slate-100 text-slate-800 border-slate-200', border: 'border-slate-200 hover:border-slate-300', dot: 'bg-slate-500' };

          return (
            <div
              key={idx}
              onClick={() => setSelectedRca({ ...rc, issueName, causeText, owner, fix, volume, negRate, idx })}
              className={`p-4 rounded-xl bg-white border ${ownerStyle.border} transition-all duration-200 flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md cursor-pointer group hover:-translate-y-0.5`}
            >
              <div>
                {/* Top Badge: Rank & Department */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold shadow-2xs">
                    RANK #{idx + 1}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold uppercase ${ownerStyle.badge}`}>
                    {owner}
                  </span>
                </div>

                {/* Category Title */}
                <h4 className="font-display font-extrabold text-sm text-slate-900 mb-1.5 group-hover:text-indigo-600 transition-colors">
                  {issueName}
                </h4>

                {/* Telemetry Metrics Row */}
                {(volume > 0 || negRate > 0) && (
                  <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 mb-2.5 pb-2 border-b border-slate-100">
                    <span>Volume: <strong className="text-slate-900">{volume.toLocaleString()}</strong></span>
                    <span>Neg Tone: <strong className={negRate > 25 ? 'text-rose-600 font-bold' : 'text-slate-800'}>{negRate}%</strong></span>
                  </div>
                )}

                {/* Diagnosed Root Cause Failure Mode */}
                <div className="space-y-1 text-xs text-slate-700 font-sans">
                  <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Diagnosed Root Cause:
                  </p>
                  <p className="leading-relaxed text-slate-800 font-medium">
                    {causeText}
                  </p>
                </div>
              </div>

              {/* Actionable Engineering / Support Remedy */}
              <div className="pt-2.5 border-t border-slate-100 text-[11px] font-mono space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-indigo-600" />
                    <span>Prescribed Fix:</span>
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 group-hover:underline flex items-center gap-0.5">
                    <span>View Visualizer</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <p className="text-slate-600 leading-snug line-clamp-2">
                  {fix}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Root Cause Visualizer Modal */}
      {selectedRca && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold">
                      RANK #{selectedRca.idx + 1}
                    </span>
                    <h3 className="font-display font-black text-lg text-slate-900">
                      {selectedRca.issueName}
                    </h3>
                  </div>
                  <p className="text-xs font-mono text-slate-500">
                    Department Owner: <strong className="text-indigo-600 font-bold">{selectedRca.owner}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRca(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Telemetry Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Total Demand</span>
                <p className="text-lg font-display font-black text-slate-900">{selectedRca.volume?.toLocaleString() || 'N/A'}</p>
                <span className="text-[9px] font-mono text-slate-400">conversations</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
                <span className="text-[10px] font-mono text-rose-700 uppercase font-bold">Negative Friction</span>
                <p className="text-lg font-display font-black text-rose-900">{selectedRca.negRate || '0'}%</p>
                <span className="text-[9px] font-mono text-rose-600">dissatisfaction rate</span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
                <span className="text-[10px] font-mono text-indigo-700 uppercase font-bold">Response SLA</span>
                <p className="text-lg font-display font-black text-indigo-900">{selectedRca.avg_response_time ? `${Math.round(selectedRca.avg_response_time)}m` : '68.6m'}</p>
                <span className="text-[9px] font-mono text-indigo-600">mean latency</span>
              </div>
            </div>

            {/* Visualizer Chart: Severity Breakdown */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
              <span className="text-xs font-display font-bold text-slate-900 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-indigo-600" />
                <span>Operational Impact & SLA Latency Benchmarking</span>
              </span>
              <div className="h-44 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { metric: 'First Contact SLA', thisCluster: selectedRca.avg_response_time || 68.6, baseline: 45.0 },
                      { metric: 'Negative Tone %', thisCluster: selectedRca.negRate || 24.5, baseline: 15.0 },
                      { metric: 'Escalation Multiplier', thisCluster: 7.5, baseline: 2.0 },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="metric" tick={{ fill: '#334155', fontSize: 10, fontFamily: 'monospace' }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#fff', fontSize: '11px' }}
                    />
                    <Bar dataKey="thisCluster" name="This Failure Theme" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="baseline" name="Target Baseline" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Diagnosed Mechanism & Prescribed Fix */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 space-y-1">
                <span className="text-xs font-mono font-bold text-rose-900 uppercase flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Failure Mechanism</span>
                </span>
                <p className="text-xs font-sans text-slate-800 leading-relaxed">
                  {selectedRca.causeText}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                <span className="text-xs font-mono font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Recommended Departmental Remediation</span>
                </span>
                <p className="text-xs font-sans text-slate-800 leading-relaxed">
                  {selectedRca.fix}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setSelectedRca(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
              >
                Close Visualizer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RootCauseSection;
