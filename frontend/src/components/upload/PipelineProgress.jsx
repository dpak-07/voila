import React from 'react';
import { useQuery } from '@tanstack/react-query';
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
  MapPin
} from 'lucide-react';
import { analyticsApi } from '../../api/analytics';

const TRACKING_STAGES = [
  { id: 'ingest', label: '1. Ingest', full: 'Ingest & Schema Parse', icon: Package },
  { id: 'nlp', label: '2. RoBERTa', full: 'Sentiment & Intent NLP', icon: Brain },
  { id: 'clustering', label: '3. BERTopic', full: 'Semantic Clustering', icon: Cpu },
  { id: 'metrics', label: '4. Metrics', full: 'KPI & Spike Detection', icon: BarChart3 },
  { id: 'rag', label: '5. Ready', full: 'Pipeline Complete', icon: CheckCheck },
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
  const isComplete = latestLog && (latestLog.step === 'COMPLETE' || latestLog.step === 'completed');

  // Determine current active step (1 to 5)
  let currentStep = 5;
  let currentStepName = "Vector Index Live & Materialized";
  let statusText = "Materialized";

  if (!latestLog) {
    currentStep = 5;
    currentStepName = "Vector Index Live & Materialized";
    statusText = "Ready";
  } else if (latestLog.status === 'running' || latestLog.status === 'started') {
    const stepName = (latestLog.step || '').toLowerCase();
    statusText = "In Transit";
    if (stepName.includes('ingest') || stepName.includes('init') || stepName.includes('text_clean')) {
      currentStep = 1;
      currentStepName = "CSV Ingest & Schema Parsing";
    } else if (stepName.includes('nlp') || stepName.includes('sentiment') || stepName.includes('clean')) {
      currentStep = 2;
      currentStepName = "Sentiment & Intent NLP";
    } else if (stepName.includes('cluster') || stepName.includes('topic') || stepName.includes('bertopic')) {
      currentStep = 3;
      currentStepName = "Semantic Topic Clustering";
    } else if (stepName.includes('kpi') || stepName.includes('metric') || stepName.includes('spike') || stepName.includes('data_proces')) {
      currentStep = 4;
      currentStepName = "KPI & Z-Score Aggregation";
    } else if (stepName.includes('rag') || stepName.includes('vector') || stepName.includes('complete')) {
      currentStep = 5;
      currentStepName = "Pipeline Complete";
    }
  }

  const progressPercent = ((currentStep - 1) / (TRACKING_STAGES.length - 1)) * 100;

  return (
    <div className="h-full flex flex-col justify-between p-5 rounded-3xl glass-card border border-slate-200/90 dark:border-white/10 shadow-lg space-y-4">
      {/* Header with Real-time Position Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-sm text-slate-900 dark:text-white">
              Live Ingestion Pipeline Position
            </h3>
            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              Flipkart-style real-time milestone tracker
            </p>
          </div>
        </div>

        {/* Real-time Position Tag */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-800 dark:text-indigo-300 text-xs font-mono font-bold">
          <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-bounce" />
          <span>Stage {currentStep}/5 ({progressPercent.toFixed(0)}%) · {currentStepName}</span>
        </div>
      </div>

      {/* ── Flipkart Package Tracking Stepper ── */}
      <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/10 relative overflow-hidden">
        {/* Horizontal Progress Connecting Line */}
        <div className="hidden sm:block absolute top-[30px] left-[10%] right-[10%] h-1 bg-slate-200 dark:bg-white/10 rounded-full z-0">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-600 via-violet-600 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
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
                    isPassed
                      ? 'bg-emerald-500 text-white shadow-emerald-500/25 ring-2 ring-emerald-500/20'
                      : isCurrent
                      ? 'bg-indigo-600 text-white shadow-indigo-500/30 ring-2 ring-indigo-600/30 animate-pulse'
                      : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/10'
                  }`}
                >
                  {isPassed ? <CheckCheck className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>

                <div>
                  <span className={`text-[11px] font-display font-bold block leading-tight ${
                    isPassed ? 'text-emerald-700 dark:text-emerald-300' : isCurrent ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {stage.label}
                  </span>
                  <span className={`inline-block text-[9px] font-mono font-bold uppercase ${
                    isPassed ? 'text-emerald-600' : isCurrent ? 'text-indigo-600' : 'text-slate-400'
                  }`}>
                    {isPassed ? 'Passed' : isCurrent ? 'Active...' : 'Queued'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Live Telemetry Strip from pipeline_history ── */}
      {latestLog && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/10 font-mono">
            <span className="text-[9px] text-slate-400 uppercase font-semibold block">Latest Step</span>
            <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate capitalize">{(latestLog.step || 'Processing').replace(/_/g, ' ')}</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/10 font-mono">
            <span className="text-[9px] text-slate-400 uppercase font-semibold block">Status</span>
            <div className={`text-xs font-bold mt-0.5 capitalize ${latestLog.status === 'success' || latestLog.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : latestLog.status === 'failed' ? 'text-rose-600' : 'text-indigo-600 dark:text-indigo-400'}`}>{latestLog.status || 'Running'}</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/10 font-mono">
            <span className="text-[9px] text-slate-400 uppercase font-semibold block">Run ID</span>
            <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 font-mono">{latestLog.run_id ? `#${latestLog.run_id.slice(0, 8)}` : '—'}</div>
          </div>
        </div>
      )}

      {/* Background Access Notice */}
      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-500/30 text-[11px]">
        <span className="text-indigo-900 dark:text-indigo-200 font-medium">
          ✨ You can navigate to other pages anytime while ingestion runs.
        </span>
        <button
          onClick={() => navigate('/')}
          className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] transition-all cursor-pointer shrink-0"
        >
          View Dashboard →
        </button>
      </div>
    </div>
  );
}

export default PipelineProgress;
