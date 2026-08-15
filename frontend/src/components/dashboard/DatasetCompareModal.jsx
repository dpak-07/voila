import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GitCompare, ArrowRight, TrendingUp, TrendingDown, Minus, CheckCircle, AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { analyticsApi } from '../../api/analytics';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { ConfidenceBadge } from '../common/ConfidenceBadge';

export function DatasetCompareModal({ isOpen, onClose, runs = [], activeRunId }) {
  const [currentRunId, setCurrentRunId] = useState(activeRunId === 'all' ? (runs[0]?.run_id || '') : activeRunId);
  const [previousRunId, setPreviousRunId] = useState(runs[1]?.run_id || (runs[0]?.run_id || ''));

  const { data: compareData, isLoading } = useQuery({
    queryKey: ['compare_runs_modal', currentRunId, previousRunId],
    queryFn: () => analyticsApi.compareRuns(currentRunId, previousRunId),
    enabled: Boolean(isOpen),
  });

  const delta = compareData?.comparison_summary || {};
  const topicEvol = compareData?.topic_evolution || {};

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dataset Delta & Cross-Run Comparison" maxWidth="max-w-3xl">
      <div className="space-y-6 font-sans">
        {/* Run Selector controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-semibold">
              Current Run (T1)
            </label>
            <select
              value={currentRunId}
              onChange={(e) => setCurrentRunId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-100 outline-none"
            >
              {runs.map((r, idx) => (
                <option key={r.run_id} value={r.run_id}>
                  Run #{idx + 1} · {r.run_id.slice(0, 8)} ({r.total_records?.toLocaleString()} msgs)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-semibold">
              Baseline Run (T0)
            </label>
            <select
              value={previousRunId}
              onChange={(e) => setPreviousRunId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-100 outline-none"
            >
              {runs.map((r, idx) => (
                <option key={r.run_id} value={r.run_id}>
                  Run #{idx + 1} · {r.run_id.slice(0, 8)} ({r.total_records?.toLocaleString()} msgs)
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <LoadingSkeleton rows={4} height="h-20" />
        ) : (
          <div className="space-y-5">
            {/* Metric Deltas Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-center">
                <span className="text-[10px] text-zinc-400 uppercase">Volume Delta</span>
                <p className="text-base font-bold text-zinc-100 mt-1">
                  {delta.volume_change ? (delta.volume_change > 0 ? `+${delta.volume_change}` : delta.volume_change) : '0'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-center">
                <span className="text-[10px] text-zinc-400 uppercase">Response Time Delta</span>
                <p className="text-base font-bold text-zinc-200 mt-1">
                  {delta.avg_response_time_minutes?.delta !== undefined ? `${delta.avg_response_time_minutes.delta > 0 ? '+' : ''}${delta.avg_response_time_minutes.delta}m` : '0m'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-center">
                <span className="text-[10px] text-zinc-400 uppercase">Negative Tone Delta</span>
                <p className="text-base font-bold text-rose-400 mt-1">
                  {delta.negative_sentiment_percentage?.percentage_change !== undefined ? `${delta.negative_sentiment_percentage.percentage_change}%` : '0%'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-center">
                <span className="text-[10px] text-zinc-400 uppercase">Resolution Delta</span>
                <p className="text-base font-bold text-emerald-400 mt-1">
                  {delta.resolution_rate?.delta !== undefined ? `${delta.resolution_rate.delta > 0 ? '+' : ''}${delta.resolution_rate.delta}%` : '0%'}
                </p>
              </div>
            </div>

            {/* Topic Evolution: New vs Subsiding */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <h4 className="font-display font-bold text-xs text-zinc-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Newly Emerged Topics
                </h4>
                {(topicEvol.new_emerging_topics || []).length === 0 ? (
                  <p className="text-xs font-mono text-zinc-500">No new topic themes emerged.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-zinc-300 font-mono">
                    {(topicEvol.new_emerging_topics || []).map((t, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        <span className="capitalize">{(t.cluster_name || t.topic_keywords || '').replace(/_/g, ' ')}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <h4 className="font-display font-bold text-xs text-zinc-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Resolved / Subsiding Themes
                </h4>
                {(topicEvol.resolved_or_subsided_topics || []).length === 0 ? (
                  <p className="text-xs font-mono text-zinc-500">No resolved topics recorded.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-zinc-300 font-mono">
                    {(topicEvol.resolved_or_subsided_topics || []).map((t, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="capitalize">{(t.cluster_name || t.topic_keywords || '').replace(/_/g, ' ')}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default DatasetCompareModal;
