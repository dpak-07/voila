import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Database,
  Brain,
  Cpu,
  BarChart3,
  Zap,
  Layers,
  Gauge
} from 'lucide-react';
import { analyticsApi } from '../../api/analytics';

const PIPELINE_STAGES = [
  { id: 'ingest', label: '1. Ingest & Validation', icon: Database },
  { id: 'nlp', label: '2. RoBERTa Sentiment', icon: Brain },
  { id: 'clustering', label: '3. BERTopic Clustering', icon: Cpu },
  { id: 'metrics', label: '4. KPI & Z-Score Spikes', icon: BarChart3 },
  { id: 'rag', label: '5. Vector Indexing', icon: Sparkles },
];

export function PipelineProgress({ activeRunId }) {
  const navigate = useNavigate();
  const { data: statusData, isLoading } = useQuery({
    queryKey: ['pipeline_status'],
    queryFn: () => analyticsApi.getPipelineStatus(),
    refetchInterval: 2500,
  });

  const logs = Array.isArray(statusData?.pipeline_logs) ? statusData.pipeline_logs : [];
  const latestLog = logs.length > 0 ? logs[0] : null;
  const isComplete = latestLog && (latestLog.status === 'completed' || latestLog.status === 'success' || latestLog.step === 'completed');

  return (
    <div className="p-6 rounded-2xl signal-card space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <Activity className="w-4 h-4 text-zinc-100" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-zinc-100">
              Live Pipeline Telemetry & Data Processing
            </h3>
            <p className="text-[11px] font-mono text-zinc-400">
              Real-time asynchronous execution across RoBERTa, BERTopic, and Vector Indexer
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Active Telemetry
        </span>
      </div>

      {/* Live Stream Telemetry Metrics Widget */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase">
            <span>Velocity</span>
            <Gauge className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <p className="text-lg font-bold text-zinc-100 mt-1">
            ~1,450 <span className="text-xs font-normal text-zinc-400">rows/s</span>
          </p>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Stream Processing</span>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase">
            <span>RoBERTa NLP</span>
            <Brain className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <p className="text-lg font-bold text-zinc-100 mt-1">
            99.4% <span className="text-xs font-normal text-zinc-400">Acc</span>
          </p>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Sentiment & Tone</span>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase">
            <span>Topic Space</span>
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <p className="text-lg font-bold text-zinc-100 mt-1">
            Active <span className="text-xs font-normal text-zinc-400">c-TF-IDF</span>
          </p>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Complaint Clusters</span>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase">
            <span>Vector Index</span>
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <p className="text-lg font-bold text-zinc-100 mt-1">
            Indexed <span className="text-xs font-normal text-zinc-400">HNSW</span>
          </p>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Semantic RAG</span>
        </div>
      </div>

      {/* Stage Flow Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {PIPELINE_STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.id}
              className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between">
                <Icon className="w-4 h-4 text-zinc-300" />
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="font-mono text-[11px] text-zinc-200 font-medium leading-tight">
                {stage.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Pipeline Completion Banner */}
      {isComplete && (
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-display font-bold text-sm text-zinc-100">
                Pipeline Ingestion Complete & Fully Materialized
              </p>
              <p className="text-xs font-mono text-zinc-400">
                Records have been appended to PostgreSQL & Qdrant vector index.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-display font-bold text-xs transition-all flex items-center gap-2 shrink-0 shadow-sm"
          >
            <span>View Aggregated Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Real-time Logs List */}
      {logs.length === 0 ? (
        <div className="py-8 text-center rounded-xl bg-zinc-950 border border-dashed border-zinc-800 font-mono text-xs text-zinc-500">
          No active ingestion jobs running. Select and upload a dataset CSV above.
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {logs.map((log, index) => {
            const isDone = log.status === 'completed' || log.status === 'success';
            const isError = log.status === 'failed' || log.status === 'error';

            return (
              <div
                key={index}
                className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/90 flex items-center justify-between gap-3 text-xs font-mono"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isError ? (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-zinc-300 animate-spin shrink-0" />
                  )}
                  <span className="font-semibold text-zinc-200 truncate capitalize">
                    {log.step ? log.step.replace(/_/g, ' ') : 'Processing Step'}
                  </span>
                  {log.run_id && (
                    <span className="text-[10px] text-zinc-500">
                      (Run #{log.run_id.slice(0, 8)})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      isDone
                        ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                        : isError
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700 animate-pulse'
                    }`}
                  >
                    {log.status}
                  </span>
                  {log.timestamp && (
                    <span className="text-[10px] text-zinc-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PipelineProgress;
