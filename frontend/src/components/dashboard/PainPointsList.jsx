import React, { useState } from 'react';
import { AlertCircle, ArrowUpRight, MessageSquare, ShieldAlert, Sparkles } from 'lucide-react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';
import { EmptyDiagnostic } from '../common/EmptyDiagnostic';
import { RagEvidenceDrawer } from './RagEvidenceDrawer';

function getCleanClusterName(point) {
  if (point.cluster_name && !point.cluster_name.includes(',') && point.cluster_name.length > 3) {
    return point.cluster_name;
  }
  const kw = (point.topic_keywords || point.issue || point.cluster_name || '').toLowerCase();
  if (kw.includes('crash') || kw.includes('freeze') || kw.includes('bug') || kw.includes('error') || kw.includes('stability')) {
    return 'App Crashes & System Stability';
  }
  if (kw.includes('delivery') || kw.includes('order') || kw.includes('track') || kw.includes('shipment') || kw.includes('delay') || kw.includes('baggage')) {
    return 'Delivery, Order Tracking & Delays';
  }
  if (kw.includes('bill') || kw.includes('charge') || kw.includes('invoice') || kw.includes('payment') || kw.includes('cost') || kw.includes('subscription')) {
    return 'Billing, Invoices & Payment Inquiries';
  }
  if (kw.includes('login') || kw.includes('password') || kw.includes('auth') || kw.includes('2fa') || kw.includes('account') || kw.includes('lock')) {
    return 'Account Access & Password Authentication';
  }
  if (kw.includes('refund') || kw.includes('cancel') || kw.includes('dispute') || kw.includes('return') || kw.includes('claim')) {
    return 'Refunds, Cancellations & Dispute Resolution';
  }
  if (kw.includes('battery') || kw.includes('power') || kw.includes('drain') || kw.includes('heat') || kw.includes('hardware')) {
    return 'Hardware & Battery Health Performance';
  }
  if (kw.includes('thanks') || kw.includes('thank') || kw.includes('help') || kw.includes('praise') || kw.includes('assist')) {
    return 'Customer Service Praise & Quick Help';
  }
  return point.cluster_name || point.topic_keywords || 'General Customer Inquiries';
}

export function PainPointsList({ painPoints = [], topicSummaries = [] }) {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleInspectTopic = (topicName) => {
    setSelectedTopic(topicName);
    setIsDrawerOpen(true);
  };

  // Merge or adapt pain points and topic summaries
  const rawPoints = Array.isArray(painPoints) ? painPoints : [];
  const rawSummaries = Array.isArray(topicSummaries) ? topicSummaries : [];
  const items = rawPoints.length > 0 ? rawPoints : rawSummaries;

  if (!items || items.length === 0) {
    return (
      <div className="p-6 rounded-2xl signal-card">
        <h3 className="font-display font-bold text-base text-zinc-900 mb-2 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-zinc-900" />
          Ranked Customer Pain Points
        </h3>
        <EmptyDiagnostic
          title="No Complaint Clusters Found"
          message="No negative customer topics or pain points detected in the active slice."
          requiredFields={["text", "sentiment"]}
          compact={true}
        />
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl signal-card flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-bold text-base text-zinc-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-zinc-900" />
            Ranked Customer Pain Points
          </h3>
          <span className="text-xs font-mono text-zinc-500 font-semibold">
            {items.length} prioritized themes
          </span>
        </div>
        <p className="text-xs font-mono text-zinc-500 mb-4">
          Algorithmic clustering by severity index, negative volume, and customer friction
        </p>

        {/* List of pain points */}
        <div className="space-y-3">
          {items.slice(0, 6).map((point, index) => {
            const topicTitle = getCleanClusterName(point);
            const volume = point.volume || point.count || point.total_records || 0;
            const negComplaints = point.negative_complaints ?? point.negative_volume ?? 0;
            const negRate = point.negative_sentiment_percentage ?? point.negative_percentage ?? (volume > 0 ? Math.round((negComplaints / volume) * 100) : 0);

            return (
              <div
                key={index}
                className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 hover:border-zinc-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group shadow-2xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-mono font-bold">
                      {index + 1}
                    </span>
                    <h4 className="font-display font-bold text-zinc-900 text-sm truncate capitalize">
                      {topicTitle}
                    </h4>
                    {point.status && (
                      <span className="px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 text-[10px] font-mono font-semibold uppercase">
                        {point.status}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-zinc-500 mt-1.5">
                    <span>
                      Volume: <strong className="text-zinc-900">{volume.toLocaleString()}</strong>
                    </span>
                    <span>
                      Neg Tone: <strong className={negRate > 25 ? 'text-rose-600 font-bold' : 'text-zinc-800'}>{negRate}%</strong>
                    </span>
                    {point.escalations !== undefined && (
                      <span>
                        Escalations: <strong className="text-zinc-900">{point.escalations}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Inspect RAG evidence button */}
                <button
                  onClick={() => handleInspectTopic(topicTitle)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 transition-colors text-xs font-mono font-semibold shrink-0 shadow-2xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Inspect Quotes</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* RAG Evidence Drawer */}
      <RagEvidenceDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        topicQuery={selectedTopic}
      />
    </div>
  );
}

export default PainPointsList;
