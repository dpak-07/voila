import React from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  Activity,
  CheckCircle2,
  Clock,
  Database,
  Layers,
  Cpu,
  Sparkles,
  GitBranch,
  FileCheck2,
} from 'lucide-react';

export const PipelineTracker: React.FC = () => {
  const { pipelineLogs, activeRun } = useApp();

  const pipelineStages = [
    { name: '1. Ingest Raw Dataset Stream', desc: 'Direct RAM stream into pandas chunk buffer & S3 mirror', icon: <Database className="w-4 h-4 text-cyan-400" /> },
    { name: '2. Text Normalization & PII Masking', desc: 'Regex anonymization of emails, handles, card numbers & URLs', icon: <Layers className="w-4 h-4 text-indigo-400" /> },
    { name: '3. Transformer Sentiment & Polarity Inference', desc: 'DistilBERT / VADER polarity scoring (-1.0 to +1.0 continuous)', icon: <Cpu className="w-4 h-4 text-emerald-400" /> },
    { name: '4. HDBSCAN & TF-IDF Topic Clustering', desc: 'Unsupervised semantic clustering with dynamic keyword extraction', icon: <GitBranch className="w-4 h-4 text-purple-400" /> },
    { name: '5. Z-Score Anomaly & Spike Detection', desc: 'Statistical outlier identification for volume and friction surge (>2.5σ)', icon: <Activity className="w-4 h-4 text-rose-400" /> },
    { name: '6. 15 Operational Metrics Aggregation', desc: 'Sub-2ms pre-calculated KPI signatures written to PostgreSQL', icon: <CheckCircle2 className="w-4 h-4 text-teal-400" /> },
    { name: '7. GenAI Executive Directives Grounding', desc: 'LLM boss directives & recommendation synthesis', icon: <Sparkles className="w-4 h-4 text-amber-400" /> },
  ];

  return (
    <div className="executive-card space-y-4">
      <div className="executive-card-header">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs md:text-sm font-bold text-white">PostgreSQL Data Pipeline Telemetry Flow</h3>
            <p className="text-[11px] text-slate-400">
              Execution stages and timestamps for active Run ID:{' '}
              <span className="font-mono text-cyan-400 font-bold">{activeRun?.run_id || 'run-w32-2026'}</span>
            </p>
          </div>
        </div>
        <span className="badge-emerald">All 7 Stages Healthy</span>
      </div>

      {/* Pipeline Stage Cards */}
      <div className="space-y-2.5">
        {pipelineStages.map((stage, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 rounded-xl bg-surface-100/70 border border-surface-border hover:bg-surface-100 transition text-xs group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-obsidian-950 border border-surface-border text-slate-300 group-hover:scale-105 transition-transform">
                {stage.icon}
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">{stage.name}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{stage.desc}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] text-slate-400 hidden sm:inline">
                2026-08-15 08:30:{10 + idx * 12}
              </span>
              <StatusBadge status="SUCCESS" size="sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
