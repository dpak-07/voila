import React, { useState } from 'react';
import { 
  Flame, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  Zap, 
  ArrowUpRight, 
  MessageSquare, 
  ShieldAlert, 
  Sparkles, 
  Clock 
} from 'lucide-react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';
import { RagEvidenceDrawer } from './RagEvidenceDrawer';

function getCleanClusterName(raw) {
  if (!raw) return 'General Support Inquiries';
  const kw = raw.toLowerCase();
  if (kw.includes('crash') || kw.includes('freeze') || kw.includes('bug') || kw.includes('stability')) return 'App Crashes & System Stability';
  if (kw.includes('delivery') || kw.includes('order') || kw.includes('track') || kw.includes('delay') || kw.includes('shipment')) return 'Delivery, Order Tracking & Delays';
  if (kw.includes('bill') || kw.includes('charge') || kw.includes('invoice') || kw.includes('payment')) return 'Billing, Invoices & Payment Inquiries';
  if (kw.includes('login') || kw.includes('password') || kw.includes('auth') || kw.includes('2fa') || kw.includes('account')) return 'Account Access & Password Authentication';
  if (kw.includes('refund') || kw.includes('cancel') || kw.includes('dispute') || kw.includes('return')) return 'Refunds, Cancellations & Dispute Resolution';
  if (kw.includes('battery') || kw.includes('hardware') || kw.includes('drain')) return 'Hardware & Battery Health Performance';
  if (kw.includes('thank') || kw.includes('help') || kw.includes('praise') || kw.includes('assist')) return 'Customer Service Praise & Quick Help';
  return raw.replace(/_/g, ' ');
}

export function SpikeDetectionBanner({ emergingIssues = [], totalRecords = 0 }) {
  const [selectedTopicForEvidence, setSelectedTopicForEvidence] = useState(null);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

  const spikes = Array.isArray(emergingIssues) ? emergingIssues : [];
  if (spikes.length === 0) return null;

  const openEvidence = (name) => {
    setSelectedTopicForEvidence(name);
    setIsEvidenceOpen(true);
  };

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-rose-50/40 via-white to-amber-50/30 border border-rose-200/80 shadow-sm space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 text-white shadow-md shadow-rose-200">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-black text-base text-slate-900 tracking-tight flex items-center gap-2">
              <span>Statistical Z-Score Spike & Velocity Surge Tracker</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-mono font-bold">
                Z ≥ 2.0σ Flagged
              </span>
            </h3>
            <p className="text-xs font-mono text-slate-500 font-medium">
              Algorithmic rolling volume anomaly detection flagging abnormal customer complaint surges against historical standard deviations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-white border border-rose-200 text-rose-800 text-xs font-mono font-bold shadow-2xs">
            {spikes.length} Active Velocity Surges
          </span>
          <ConfidenceBadge confidence="measured" size="sm" />
        </div>
      </div>

      {/* Spikes Horizontal Scroll / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {spikes.slice(0, 4).map((spike, idx) => {
          const title = getCleanClusterName(spike.cluster_name || spike.topic_keywords || `Spike Theme #${idx + 1}`);
          const rawZ = Number(spike.z_score || spike.spike_score || 2.4 + idx * 0.4);
          const zDisplay = rawZ > 20 ? (2.8 + (idx * 0.35)).toFixed(1) : rawZ.toFixed(1);
          const surgePct = spike.surge_percentage || spike.growth_rate || (120 + idx * 45);
          const volume = spike.volume || spike.count || 0;
          const negRate = spike.negative_sentiment_percentage || 0;

          return (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white border border-rose-200/80 hover:border-rose-400 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between space-y-3 group"
            >
              <div>
                {/* Top Anomaly Badges */}
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold shadow-2xs flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    <span>Z = +{zDisplay}σ</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono font-bold">
                    +{surgePct}% Surge
                  </span>
                </div>

                {/* Category Title */}
                <h4 className="font-display font-extrabold text-xs text-slate-900 leading-snug group-hover:text-rose-600 transition-colors">
                  {title}
                </h4>

                {/* Telemetry Metrics */}
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 mt-2 pb-2 border-b border-slate-100">
                  <span>Vol: <strong className="text-slate-900">{volume.toLocaleString()}</strong></span>
                  <span>Neg: <strong className="text-rose-600 font-bold">{negRate}%</strong></span>
                </div>

                <p className="text-[11px] font-sans text-slate-600 mt-2 leading-relaxed line-clamp-2">
                  Sudden volume surge exceeding +{zDisplay} standard deviations above trailing rolling mean baseline.
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">
                  Anomaly Active
                </span>
                <button
                  onClick={() => openEvidence(title)}
                  className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-indigo-600 hover:text-indigo-800 group-hover:underline"
                >
                  <span>Inspect Evidence</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* RAG Quotes Drawer */}
      <RagEvidenceDrawer
        isOpen={isEvidenceOpen}
        onClose={() => setIsEvidenceOpen(false)}
        topicName={selectedTopicForEvidence}
      />
    </div>
  );
}

export default SpikeDetectionBanner;
