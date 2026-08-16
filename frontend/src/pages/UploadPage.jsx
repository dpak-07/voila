import React, { useState } from 'react';
import { UploadCloud, Database, Activity, CheckCircle, Layers } from 'lucide-react';
import { DragDropZone } from '../components/upload/DragDropZone';
import { PipelineProgress } from '../components/upload/PipelineProgress';
import { RunHistoryTable } from '../components/upload/RunHistoryTable';
import { useRun } from '../context/RunContext';

export function UploadPage() {
  const { activeRunId, setActiveRunId } = useRun();
  const [lastUploadedRunId, setLastUploadedRunId] = useState(null);

  const handleUploadSuccess = (runId) => {
    setLastUploadedRunId(runId);
    setActiveRunId(runId);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl signal-card">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200">
            <UploadCloud className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 tracking-tight">
              Dataset Ingestion & Streaming Pipelines
            </h2>
            <p className="text-xs font-mono text-slate-600 mt-0.5">
              Upload multi-million row social-support exports. Streams directly to S3 and triggers PostgreSQL analytics.
            </p>
          </div>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <DragDropZone onUploadSuccess={handleUploadSuccess} />

      {/* Real-time Ingestion Progress Telemetry */}
      <PipelineProgress activeRunId={lastUploadedRunId || activeRunId} />

      {/* Historical Runs Catalog Table */}
      <RunHistoryTable />
    </div>
  );
}

export default UploadPage;
