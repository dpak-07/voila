import React, { useState } from 'react';
import { Database, Check, Clock, User, ArrowRight, Trash2, AlertTriangle, X } from 'lucide-react';
import { useRun } from '../../context/RunContext';
import { analyticsApi } from '../../api/analytics';

export function RunHistoryTable() {
  const { runs, activeRunId, setActiveRunId, isLoadingRuns, refetchRuns } = useRun();
  const [deletingRunId, setDeletingRunId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleDelete = async (runId) => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await analyticsApi.deleteRun(runId);
      if (activeRunId === runId) {
        setActiveRunId('all');
      }
      setDeletingRunId(null);
      await refetchRuns();
    } catch (err) {
      console.error('[Delete Run Error]:', err);
      setDeleteError(err.response?.data?.detail || 'Failed to delete dataset run.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 rounded-3xl glass-card space-y-4 border border-slate-200/90 dark:border-white/10 shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center">
            <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white">
              Dataset Run Catalog & Ingestion History
            </h3>
            <p className="text-xs font-sans text-slate-500 dark:text-slate-400 mt-0.5">
              Switch active datasets, inspect previous slices, or permanently remove old runs
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">
          {runs.length} ingested runs
        </span>
      </div>

      {deleteError && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-mono flex items-center justify-between">
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="text-rose-500 hover:text-rose-800 dark:hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {runs.length === 0 ? (
        <div className="py-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-200 dark:border-white/10 font-mono text-xs text-slate-500">
          No dataset runs found in database. Upload a CSV to start.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 uppercase text-[10px]">
                <th className="pb-3 px-3">Run ID</th>
                <th className="pb-3 px-3">Source Name</th>
                <th className="pb-3 px-3">Total Rows</th>
                <th className="pb-3 px-3">Ingestion Date</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {runs.map((r, idx) => {
                const isActive = r.run_id === activeRunId;
                return (
                  <tr
                    key={r.run_id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors ${
                      isActive ? 'bg-indigo-50/50 dark:bg-indigo-600/10 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3.5 px-3">
                      <span className="text-slate-900 dark:text-white">Run #{idx + 1} · {r.run_id.slice(0, 8)}</span>
                      {isActive && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-[9px] uppercase font-bold">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300 truncate max-w-xs" title={r.source_name}>
                      {r.source_name ? r.source_name.split(/[/\\]/).pop() : 'Direct Upload'}
                    </td>
                    <td className="py-3.5 px-3 text-slate-900 dark:text-white font-bold">
                      {r.total_records ? Number(r.total_records).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400">
                      {r.uploaded_at ? new Date(r.uploaded_at).toLocaleString() : 'Recent'}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30">
                            <Check className="w-3.5 h-3.5" />
                            Selected
                          </span>
                        ) : (
                          <button
                            onClick={() => setActiveRunId(r.run_id)}
                            className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 transition-colors text-[11px] font-semibold cursor-pointer shadow-2xs"
                          >
                            Set Active
                          </button>
                        )}

                        <button
                          onClick={() => setDeletingRunId(r.run_id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete Dataset Run"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal for Deleting Dataset Run */}
      {deletingRunId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-3xl shadow-2xl p-6 space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-base">
                  Delete Dataset Run?
                </h3>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  Run ID: #{deletingRunId.slice(0, 8)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              Are you sure you want to permanently delete this dataset run? This will remove all ingested customer conversations, NLP topic clusters, and KPI metrics calculated for this upload.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/10">
              <button
                onClick={() => setDeletingRunId(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono text-xs font-semibold border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingRunId)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RunHistoryTable;
