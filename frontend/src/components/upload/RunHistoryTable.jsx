import React from 'react';
import { Database, Check, Clock, User, ArrowRight } from 'lucide-react';
import { useRun } from '../../context/RunContext';

export function RunHistoryTable() {
  const { runs, activeRunId, setActiveRunId, isLoadingRuns } = useRun();

  return (
    <div className="p-6 rounded-2xl signal-card space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-display font-bold text-base text-slate-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-signal-cyan" />
            Dataset Run Catalog & History
          </h3>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Switch between historical dataset uploads to inspect past slices
          </p>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {runs.length} ingested runs
        </span>
      </div>

      {runs.length === 0 ? (
        <div className="py-8 text-center rounded-xl bg-zinc-950 border border-dashed border-zinc-800 font-mono text-xs text-zinc-500">
          No dataset runs found in database.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px]">
                <th className="pb-3 px-3">Run ID</th>
                <th className="pb-3 px-3">Source Name</th>
                <th className="pb-3 px-3">Total Rows</th>
                <th className="pb-3 px-3">Ingestion Date</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {runs.map((r, idx) => {
                const isActive = r.run_id === activeRunId;
                return (
                  <tr
                    key={r.run_id}
                    className={`hover:bg-zinc-950/60 transition-colors ${
                      isActive ? 'bg-zinc-900/80 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3.5 px-3">
                      <span className="text-zinc-200">Run #{idx + 1} · {r.run_id.slice(0, 8)}</span>
                      {isActive && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 text-[9px] uppercase">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-zinc-300 truncate max-w-xs" title={r.source_name}>
                      {r.source_name ? r.source_name.split(/[/\\]/).pop() : 'Direct Upload'}
                    </td>
                    <td className="py-3.5 px-3 text-zinc-100 font-bold">
                      {r.total_records ? r.total_records.toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3.5 px-3 text-zinc-400">
                      {r.uploaded_at ? new Date(r.uploaded_at).toLocaleString() : 'Recent'}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-zinc-200 text-xs font-semibold">
                          <Check className="w-3.5 h-3.5" />
                          Selected
                        </span>
                      ) : (
                        <button
                          onClick={() => setActiveRunId(r.run_id)}
                          className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 transition-colors text-[11px]"
                        >
                          Set Active
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RunHistoryTable;
