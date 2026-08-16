import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, Database, Activity, CheckCircle, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import { DragDropZone } from '../components/upload/DragDropZone';
import { PipelineProgress } from '../components/upload/PipelineProgress';
import { RunHistoryTable } from '../components/upload/RunHistoryTable';
import { useRun } from '../context/RunContext';

export function UploadPage() {
  const { activeRunId, setActiveRunId, totalCombinedRecords } = useRun();
  const [lastUploadedRunId, setLastUploadedRunId] = useState(null);

  const handleUploadSuccess = (runId) => {
    setLastUploadedRunId(runId);
    setActiveRunId(runId);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-4 pb-12"
    >
      {/* Compact Header Banner */}
      <div className="p-4 sm:p-5 rounded-3xl glass-card border border-slate-200/90 dark:border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                Dataset Ingestion & Streaming Pipelines
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                Active Telemetry
              </span>
            </div>
            <p className="text-xs font-sans text-slate-500 dark:text-slate-400 mt-0.5">
              Upload multi-million row CSV/Parquet exports. Real-time background embedding, BERTopic clustering & vector storage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 px-3 py-1.5 rounded-2xl border border-slate-200/80 dark:border-white/10 shrink-0">
          <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Active Records: <strong>{totalCombinedRecords?.toLocaleString() || '105,000'}</strong></span>
        </div>
      </div>

      {/* ── Compact 2-Column Grid: Upload Dropzone + Real-time Pipeline Tracker ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left (5 cols): Compact Upload Dropzone */}
        <div className="lg:col-span-5 flex flex-col">
          <DragDropZone onUploadSuccess={handleUploadSuccess} />
        </div>

        {/* Right (7 cols): Real-time Flipkart-style Pipeline Tracker */}
        <div className="lg:col-span-7 flex flex-col">
          <PipelineProgress activeRunId={lastUploadedRunId || activeRunId} />
        </div>
      </div>

      {/* ── Full Width Bottom Section: Ingested Runs Catalog Table ── */}
      <div>
        <RunHistoryTable />
      </div>
    </motion.div>
  );
}

export default UploadPage;
