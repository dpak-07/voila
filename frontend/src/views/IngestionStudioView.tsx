import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ViewHeader } from '../components/common/ViewHeader';
import { UploadDropzone } from '../components/ingestion/UploadDropzone';
import { PipelineTracker } from '../components/ingestion/PipelineTracker';
import { motion } from 'framer-motion';
import {
  UploadCloud,
  Database,
  Layers,
  Cpu,
  GitBranch,
  Activity,
  CheckCircle2,
  Sparkles,
  Terminal,
  FileSpreadsheet,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const IngestionStudioView: React.FC = () => {
  const { addToast, refreshData, setRunId } = useApp();
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);

  const presets = [
    {
      id: 'ecommerce',
      name: 'Twitter E-Commerce Support',
      rows: '14,850 conversations',
      topics: 'Checkout, Delivery, Double-Debits, App Crash',
      size: '4.8 MB',
      runId: 'run-w32-2026',
    },
    {
      id: 'fintech',
      name: 'FinTech & Payments Inquiries',
      rows: '9,200 conversations',
      topics: 'UPI Timeouts, Card 3DS, KYC Verification',
      size: '3.1 MB',
      runId: 'run-fintech-2026',
    },
    {
      id: 'saas',
      name: 'SaaS Platform Support Tickets',
      rows: '11,400 conversations',
      topics: 'Webhooks 504, OAuth2 Tokens, Billing GST',
      size: '3.9 MB',
      runId: 'run-saas-2026',
    },
  ];

  const handleLoadPreset = (preset: typeof presets[0]) => {
    setLoadingPreset(preset.id);
    addToast('Ingesting Preset', `Loading ${preset.name} dataset stream...`, 'info');

    setTimeout(() => {
      setRunId(preset.runId);
      refreshData();
      setLoadingPreset(null);
      confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
      addToast('Preset Active', `Dataset "${preset.name}" active in PostgreSQL engine.`, 'success');
    }, 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <ViewHeader
        category="Data Pipeline & Ingestion"
        badge="PostgreSQL Real-Time"
        title="Dataset Ingestion & Live Pipeline Studio"
        subtitle="High-throughput stream ingestion, PII masking, transformer sentiment inference, HDBSCAN clustering, and sub-2ms pre-aggregated metrics."
      />

      {/* 3 Quick-Load Sample Dataset Presets */}
      <div className="executive-card space-y-3">
        <div className="executive-card-header">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">One-Click Demonstration Datasets</h3>
              <p className="text-xs text-slate-400">Instantly test the analytical engine with real labeled multi-topic datasets</p>
            </div>
          </div>
          <span className="badge-cyan font-mono">3 Demo Presets Available</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="p-4 rounded-xl bg-surface-100/70 border border-surface-border hover:border-cyan-500/40 transition flex flex-col justify-between space-y-3 group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {preset.name}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400 font-semibold">{preset.size}</span>
                </div>
                <p className="text-[11px] text-cyan-300 font-mono font-bold">{preset.rows}</p>
                <p className="text-[10px] text-slate-400 mt-1">Clusters: {preset.topics}</p>
              </div>

              <button
                onClick={() => handleLoadPreset(preset)}
                disabled={loadingPreset === preset.id}
                className="w-full btn-ghost text-xs py-2 group-hover:border-cyan-500/50 group-hover:text-cyan-200"
              >
                <Sparkles className={`w-3.5 h-3.5 text-cyan-400 ${loadingPreset === preset.id ? 'animate-spin' : ''}`} />
                <span>{loadingPreset === preset.id ? 'Ingesting...' : 'Load Dataset'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Upload Dropzone */}
      <UploadDropzone />

      {/* 7-Stage Pipeline Telemetry Flow */}
      <PipelineTracker />
    </motion.div>
  );
};
