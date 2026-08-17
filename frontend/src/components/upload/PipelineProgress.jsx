import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Database,
  Brain,
  Cpu,
  BarChart3,
  Zap,
  Layers,
  Gauge,
  Package,
  Truck,
  CheckCheck,
  Sparkles,
  ShieldCheck,
  MapPin,
  Timer,
  Hourglass,
  TrendingUp,
  Server,
} from 'lucide-react';
import { analyticsApi } from '../../api/analytics';
import { useRun } from '../../context/RunContext';

const TRACKING_STAGES = [
  { id: 'ingest', label: '1. Ingest', full: 'Ingest & Schema Parse', icon: Package, typicalMs: 2000 },
  { id: 'nlp', label: '2. RoBERTa', full: 'Sentiment & Intent NLP', icon: Brain, typicalMs: 5000 },
  { id: 'clustering', label: '3. BERTopic', full: 'Semantic Clustering', icon: Cpu, typicalMs: 4000 },
  { id: 'metrics', label: '4. Metrics', full: 'KPI & Spike Detection', icon: BarChart3, typicalMs: 3000 },
  { id: 'rag', label: '5. Ready', full: 'Pipeline Complete', icon: CheckCheck, typicalMs: 0 },
];

const STEP_TO_STAGE = {
  'INIT': 0, 'STARTED': 0,
  'TEXT_CLEANING': 1, 'TEXT_CLEAN': 1,
  'SENTIMENT_NLP': 2, 'SENTIMENT': 2, 'NLP': 2,
  'TOPIC_CLUSTERING': 3, 'CLUSTER': 3, 'TOPIC': 3,
  'DATA_PROCESSED': 4, 'KPI': 4, 'METRIC': 4,
  'COMPLETE': 5, 'SUCCESS': 5,
};

function formatElapsed(seconds) {
  if (seconds < 1) return '<1s';
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

function formatETA(seconds) {
  if (seconds <= 0 || seconds > 86400) return '—';
  if (seconds < 60) return `~${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return `~${m}m ${s}s`;
}

function formatTimestamp(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '—';
  }
}

function timeBetween(isoA, isoB) {
  if (!isoA || !isoB) return null;
  try {
    return (new Date(isoB) - new Date(isoA)) / 1000;
  } catch {
    return null;
  }
}

export function PipelineProgress({ activeRunId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { runs, totalCombinedRecords, refetchRuns } = useRun();
  const [now, setNow] = useState(Date.now());

  // Tick every second for live elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleGoToCompany = () => {
    queryClient.invalidateQueries({ queryKey: ['companies_list'] });
    queryClient.invalidateQueries({ queryKey: ['dataset_runs'] });
    queryClient.invalidateQueries({ queryKey: ['analytics_kpis'] });
    refetchRuns();
    navigate('/');
  };

  // Poll pipeline status
  const { data: statusData, isLoading } = useQuery({
    queryKey: ['pipeline_status'],
    queryFn: () => analyticsApi.getPipelineStatus(),
    refetchInterval: 1000,
  });

  // Poll streaming status for chunk-level progress
  const { data: streamData } = useQuery({
    queryKey: ['stream_status'],
    queryFn: () => analyticsApi.getStreamStatus('latest'),
    refetchInterval: 1500,
  });

  const logs = Array.isArray(statusData?.pipeline_logs) ? statusData.pipeline_logs : [];
  const latestLog = logs.length > 0 ? logs[0] : null;
  const currentRun = statusData?.current_run || null;

  const logStep = String(latestLog?.step || '').toUpperCase();
  const logStatus = String(latestLog?.status || '').toUpperCase();
  const isComplete = logStep === 'COMPLETE' || logStep === 'SUCCESS' || logStatus === 'SUCCESS' || logStatus === 'COMPLETED';
  const isRunning = logStatus === 'RUNNING' || logStatus === 'STARTED' || logStatus === 'PROCESSING';
  const isFailed = logStatus === 'FAILED';

  // Streaming status
  const stream = streamData?.stream || null;
  const isStreaming = stream?.status === 'streaming' && !isComplete;
  const streamProgress = isStreaming ? (stream.progress_percentage || 0) : 0;
  const streamSpeed = isStreaming ? (stream.speed_rows_per_sec || 0) : 0;
  const streamProcessed = isStreaming ? (stream.processed_records || 0) : 0;
  const streamTotal = isStreaming ? (stream.total_records || 0) : 0;
  const streamChunk = isStreaming ? (stream.current_chunk || 0) : 0;

  useEffect(() => {
    if (latestLog) {
      if (refetchRuns) refetchRuns();
      if (isComplete) {
        queryClient.invalidateQueries({ queryKey: ['dataset_runs'] });
        queryClient.invalidateQueries({ queryKey: ['analytics_kpis'] });
        queryClient.invalidateQueries({ queryKey: ['companies_list'] });
      }
    }
  }, [logStep, logStatus, latestLog?.run_id]);

  const hasDbData = (runs && runs.length > 0) || (totalCombinedRecords || 0) > 0;
  const isStandby = !isRunning && !isComplete && !hasDbData && !isFailed;

  // Determine current step
  let currentStep = 0;
  let currentStepName = 'Pipeline Standby';
  let statusText = 'Standby';
  let currentStepIdx = 0;

  if (isFailed) {
    currentStep = 0;
    currentStepName = 'Pipeline Failed';
    statusText = 'Failed';
  } else if (isComplete) {
    currentStep = 5;
    currentStepName = 'Pipeline Complete';
    statusText = 'Complete';
  } else if (isRunning) {
    statusText = 'In Progress';
    const mapped = STEP_TO_STAGE[logStep] ?? null;
    if (mapped !== null) {
      currentStep = mapped;
    } else if (logStep.includes('INGEST') || logStep.includes('INIT') || logStep.includes('TEXT_CLEAN')) {
      currentStep = 1;
    } else if (logStep.includes('NLP') || logStep.includes('SENTIMENT')) {
      currentStep = 2;
    } else if (logStep.includes('CLUSTER') || logStep.includes('TOPIC')) {
      currentStep = 3;
    } else if (logStep.includes('KPI') || logStep.includes('METRIC') || logStep.includes('DATA_PROCES')) {
      currentStep = 4;
    } else {
      currentStep = 2;
    }

    const nameMap = {
      1: 'CSV Ingest & Schema Parsing',
      2: 'Sentiment Analysis (RoBERTa)',
      3: 'Topic Clustering (BERTopic)',
      4: 'KPI Calculation & Metrics',
    };
    currentStepName = nameMap[currentStep] || 'Processing Pipeline';
    currentStepIdx = currentStep;
  } else if (hasDbData) {
    currentStep = 5;
    currentStepName = 'Pipeline Complete';
    statusText = 'Ready';
  } else {
    currentStep = 0;
    currentStepName = 'Awaiting Dataset';
    statusText = 'Standby';
  }

  // Calculate elapsed time since pipeline start
  const elapsedSec = useMemo(() => {
    if (!currentRun?.started_at) return null;
    try {
      return (now - new Date(currentRun.started_at).getTime()) / 1000;
    } catch {
      return null;
    }
  }, [currentRun?.started_at, now]);

  // Calculate ETA based on stage timings
  const eta = useMemo(() => {
    if (isComplete || isFailed || isStandby || !currentRun?.stage_timings) return null;
    if (currentStep === 0 || currentStep === 5) return null;

    const timings = currentRun.stage_timings;
    const stageKeys = Object.keys(timings);

    // Total estimated time = sum of typical durations for remaining stages
    let totalRemainingMs = 0;
    for (let i = currentStepIdx; i < TRACKING_STAGES.length; i++) {
      totalRemainingMs += TRACKING_STAGES[i].typicalMs;
    }

    // If we have actual timing data, use it to refine
    if (stageKeys.length >= 2) {
      const firstTs = timings[stageKeys[0]];
      const lastTs = timings[stageKeys[stageKeys.length - 1]];
      const elapsedMs = timeBetween(firstTs, lastTs);
      if (elapsedMs && elapsedMs > 0) {
        const completedStages = currentStepIdx;
        const avgPerStage = elapsedMs / Math.max(1, completedStages);
        const remainingStages = TRACKING_STAGES.length - currentStepIdx - 1;
        totalRemainingMs = avgPerStage * remainingStages;
      }
    }

    return Math.max(0, totalRemainingMs / 1000);
  }, [currentStep, currentStepIdx, isComplete, isFailed, isStandby, currentRun?.stage_timings, now]);

  const progressPercent = currentStep === 0 ? 0 : Math.min(100, Math.round((currentStep / 5) * 100));

  // Calculate per-stage timing from current_run
  const stageTimingEntries = useMemo(() => {
    if (!currentRun?.stage_timings) return [];
    const entries = [];
    const keys = Object.keys(currentRun.stage_timings);
    for (let i = 0; i < keys.length; i++) {
      const step = keys[i];
      const ts = currentRun.stage_timings[step];
      const nextTs = i < keys.length - 1 ? currentRun.stage_timings[keys[i + 1]] : null;
      const duration = nextTs ? timeBetween(ts, nextTs) : (isRunning && step === logStep ? (elapsedSec || 0) - timeBetween(currentRun.started_at, ts) : null);
      entries.push({ step, timestamp: ts, duration, isCurrent: step === logStep && isRunning });
    }
    return entries;
  }, [currentRun?.stage_timings, logStep, isRunning, isComplete, elapsedSec]);

  return (
    <div className="h-full flex flex-col justify-between p-5 rounded-3xl glass-card border border-slate-200/90 dark:border-white/10 shadow-lg space-y-4">
      {/* Header with Position Badge + ETA */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-sm text-slate-900 dark:text-white">
              Upload Progress
            </h3>
            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              Real-time pipeline tracker
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Elapsed Time */}
          {isRunning && elapsedSec !== null && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold">
              <Timer className="w-3 h-3" />
              <span>Elapsed: {formatElapsed(elapsedSec)}</span>
            </div>
          )}

          {/* ETA */}
          {isRunning && eta !== null && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-bold">
              <Hourglass className="w-3 h-3" />
              <span>ETA: {formatETA(eta)}</span>
            </div>
          )}

          {/* Position Tag */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-800 dark:text-indigo-300 text-xs font-mono font-bold">
            <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-bounce" />
            <span>Stage {currentStep}/5 ({progressPercent}%) · {currentStepName}</span>
          </div>
        </div>
      </div>

      {/* Streaming Progress (when in streaming mode) */}
      {isStreaming && (
        <div className="p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
              <span className="text-[11px] font-display font-bold text-blue-900 dark:text-blue-200">
                Streaming Mode — Chunk {streamChunk}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300">
              {streamProgress.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-2 bg-blue-100 dark:bg-blue-900/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${streamProgress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-blue-700 dark:text-blue-300">
            <span>{streamProcessed.toLocaleString()} / {streamTotal.toLocaleString()} records</span>
            <span>{streamSpeed.toLocaleString()} rows/sec</span>
          </div>
        </div>
      )}

      {/* Flipkart Package Tracking Stepper */}
      <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/10 relative overflow-hidden">
        {/* Horizontal Progress Connecting Line */}
        <div className="hidden sm:block absolute top-[30px] left-[10%] right-[10%] h-1 bg-slate-200 dark:bg-white/10 rounded-full z-0">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-600 via-violet-600 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        {/* 5 Milestone Nodes */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 relative z-10">
          {TRACKING_STAGES.map((stage, idx) => {
            const stepNum = idx + 1;
            const isPassed = stepNum < currentStep || (currentStep === 5 && isComplete);
            const isCurrent = stepNum === currentStep && !isComplete;
            const Icon = stage.icon;

            return (
              <div key={stage.id} className="flex sm:flex-col items-center sm:text-center gap-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 shadow-2xs ${
                    isFailed && isCurrent
                      ? 'bg-rose-500 text-white shadow-rose-500/25 ring-2 ring-rose-500/20'
                      : isPassed
                      ? 'bg-emerald-500 text-white shadow-emerald-500/25 ring-2 ring-emerald-500/20'
                      : isCurrent
                      ? 'bg-indigo-600 text-white shadow-indigo-500/30 ring-2 ring-indigo-600/30 animate-pulse'
                      : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/10'
                  }`}
                >
                  {isFailed && isCurrent ? <AlertCircle className="w-4 h-4" /> : isPassed ? <CheckCheck className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>

                <div>
                  <span className={`text-[11px] font-display font-bold block leading-tight ${
                    isPassed ? 'text-emerald-700 dark:text-emerald-300' : isCurrent ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {stage.label}
                  </span>
                  <span className={`inline-block text-[9px] font-mono font-bold uppercase ${
                    isFailed && isCurrent ? 'text-rose-600' : isPassed ? 'text-emerald-600' : isCurrent ? 'text-indigo-600' : 'text-slate-400'
                  }`}>
                    {isFailed && isCurrent ? 'Failed' : isPassed ? 'Passed' : isCurrent ? 'Active...' : 'Queued'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Timing Breakdown */}
      {stageTimingEntries.length > 0 && isRunning && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-display font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            <Timer className="w-3 h-3" />
            Stage Timing
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {stageTimingEntries.map((entry, idx) => (
              <div
                key={entry.step}
                className={`p-2 rounded-xl text-[10px] font-mono border ${
                  entry.isCurrent
                    ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30'
                    : entry.duration !== null && entry.duration >= 0
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-500/20'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200/60 dark:border-white/10'
                }`}
              >
                <span className="text-slate-500 dark:text-slate-400 block">{entry.step.replace(/_/g, ' ')}</span>
                <span className={`font-bold block mt-0.5 ${
                  entry.isCurrent ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'
                }`}>
                  {entry.isCurrent
                    ? `Running... ${elapsedSec !== null ? formatElapsed(Math.max(0, elapsedSec - (timeBetween(currentRun?.started_at, entry.timestamp) || 0))) : ''}`
                    : entry.duration !== null && entry.duration >= 0
                    ? formatElapsed(entry.duration)
                    : formatTimestamp(entry.timestamp)
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Telemetry Strip */}
      {latestLog && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/10 font-mono">
            <span className="text-[9px] text-slate-400 uppercase font-semibold block">Latest Step</span>
            <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate capitalize">
              {(latestLog.step || 'Processing').replace(/_/g, ' ')}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/10 font-mono">
            <span className="text-[9px] text-slate-400 uppercase font-semibold block">Status</span>
            <div className={`text-xs font-bold mt-0.5 capitalize ${
              latestLog.status === 'success' || latestLog.status === 'completed'
                ? 'text-emerald-600 dark:text-emerald-400'
                : latestLog.status === 'failed'
                ? 'text-rose-600'
                : 'text-indigo-600 dark:text-indigo-400'
            }`}>
              {latestLog.status || 'Running'}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/10 font-mono">
            <span className="text-[9px] text-slate-400 uppercase font-semibold block">Run ID</span>
            <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
              {latestLog.run_id ? `#${latestLog.run_id.slice(0, 8)}` : '—'}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/10 font-mono">
            <span className="text-[9px] text-slate-400 uppercase font-semibold block">Records</span>
            <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
              {isStreaming
                ? `${streamProcessed.toLocaleString()} / ${streamTotal.toLocaleString()}`
                : currentRun?.total_records
                ? Number(currentRun.total_records).toLocaleString()
                : '—'
              }
            </div>
          </div>
        </div>
      )}

      {/* Background Access Notice / Completion CTA */}
      {isComplete ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 text-xs gap-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-emerald-900 dark:text-emerald-200 font-semibold">
              All dataset processing completed. Voice-of-Customer metrics are ready.
              {elapsedSec !== null && (
                <span className="ml-2 font-mono text-emerald-700 dark:text-emerald-300">
                  Total time: {formatElapsed(elapsedSec)}
                </span>
              )}
            </span>
          </div>
          <button
            onClick={handleGoToCompany}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
          >
            <span>Go to Company Directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : isFailed ? (
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 text-[11px]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="text-rose-900 dark:text-rose-200 font-medium">
              Pipeline failed at stage: {latestLog?.step?.replace(/_/g, ' ') || 'Unknown'}.
              {latestLog?.error && (
                <span className="ml-1 font-mono text-rose-700 dark:text-rose-300 text-[10px]">
                  {latestLog.error.slice(0, 120)}
                </span>
              )}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-500/30 text-[11px]">
          <span className="text-indigo-900 dark:text-indigo-200 font-medium">
            {isStandby
              ? "Upload a dataset using the dropzone on the left to start processing."
              : isStreaming
              ? `Streaming data in chunks — ${streamSpeed.toLocaleString()} rows/sec. You can navigate away.`
              : "Ingestion pipeline active. You can stay here or navigate anytime."}
          </span>
          {!isStandby && (
            <button
              onClick={handleGoToCompany}
              className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] transition-all cursor-pointer shrink-0 flex items-center gap-1"
            >
              <span>Company Page</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default PipelineProgress;
