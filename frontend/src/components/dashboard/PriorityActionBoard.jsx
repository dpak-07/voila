import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Flame, 
  Clock, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight, 
  ShieldAlert, 
  Activity,
  Zap,
  Target
} from 'lucide-react';
import { RagEvidenceDrawer } from './RagEvidenceDrawer';

function deriveActionableGuidance(title, category, friction) {
  const t = (title || '').toLowerCase();
  if (t.includes('crash') || t.includes('freez') || t.includes('bug') || t.includes('stability')) {
    return 'Deploy release hotfix and monitor telemetry for platform error spikes.';
  }
  if (t.includes('delivery') || t.includes('order') || t.includes('track') || t.includes('delay')) {
    return 'Audit logistics dispatch queues and update live delivery webhook notifications.';
  }
  if (t.includes('bill') || t.includes('charge') || t.includes('invoice') || t.includes('payment')) {
    return 'Enable automated refund triage and review payment gateway timeout rates.';
  }
  if (t.includes('login') || t.includes('password') || t.includes('auth') || t.includes('account')) {
    return 'Streamline self-service account recovery and monitor auth token failure velocity.';
  }
  if (t.includes('refund') || t.includes('dispute') || t.includes('cancel')) {
    return 'Prioritize dispute queue routing to senior tier-2 support agents.';
  }
  return 'Deploy targeted macro response and monitor friction metrics in weekly operational review.';
}

export function PriorityActionBoard({ painPoints = [], emergingIssues = [] }) {
  const [selectedPriority, setSelectedPriority] = useState('ALL'); // 'ALL' | 'P0' | 'P1' | 'P2' | 'P3'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTopicForEvidence, setSelectedTopicForEvidence] = useState(null);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

  // Derive ranked issues mapped to P0, P1, P2, P3
  const prioritizedIssues = useMemo(() => {
    const rawList = [];

    // Map emerging velocity issues
    if (Array.isArray(emergingIssues)) {
      emergingIssues.forEach((item, idx) => {
        const title = typeof item === 'string' ? item : item.cluster_name || item.name || item.topic || `Emerging Anomaly #${idx + 1}`;
        const vol = item.volume || item.count || 0;
        const friction = item.negative_sentiment_percentage || item.friction_rate || 0;
        
        rawList.push({
          id: `emerging-${idx}`,
          priority: 'P0 – Critical',
          priorityLevel: 'P0',
          title,
          category: 'Velocity Surge & Anomaly',
          frictionRate: friction,
          volume: vol,
          slaImpact: item.sla_impact || null,
          action: item.recommended_action || deriveActionableGuidance(title, 'Anomaly', friction),
          source: 'Spike Detector',
        });
      });
    }

    // Map clustered pain points
    if (Array.isArray(painPoints)) {
      painPoints.forEach((item, idx) => {
        const title = item.cluster_name || item.topic || item.issue || `Pain Point Cluster #${idx + 1}`;
        const vol = item.volume || item.count || item.total_records || 0;
        const friction = item.negative_sentiment_percentage != null
          ? Number(item.negative_sentiment_percentage)
          : (vol > 0 && item.negative_complaints ? ((item.negative_complaints || 0) / vol) * 100 : null);

        let priority = 'P2 – Medium';
        let priorityLevel = 'P2';

        if (vol > 10000 || (friction != null && friction > 30)) {
          priority = 'P0 – Critical';
          priorityLevel = 'P0';
        } else if (vol > 5000 || (friction != null && friction > 22)) {
          priority = 'P1 – High';
          priorityLevel = 'P1';
        } else if (vol > 0) {
          priority = 'P3 – Low';
          priorityLevel = 'P3';
        }

        rawList.push({
          id: `pain-${idx}`,
          priority,
          priorityLevel,
          title,
          category: item.category || 'Customer Friction',
          frictionRate: friction,
          volume: vol,
          slaImpact: item.sla_impact || (item.avg_response_time != null ? `${Math.round(item.avg_response_time)}m avg response` : null),
          action: item.recommended_action || deriveActionableGuidance(title, item.category, friction),
          source: 'BERTopic Engine',
        });
      });
    }

    // Deduplicate by title
    const seen = new Set();
    const unique = [];
    for (const item of rawList) {
      const key = item.title.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    // Order: P0 -> P1 -> P2 -> P3
    const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return unique.sort((a, b) => (order[a.priorityLevel] ?? 9) - (order[b.priorityLevel] ?? 9));
  }, [painPoints, emergingIssues]);

  const filteredIssues = useMemo(() => {
    if (selectedPriority === 'ALL') return prioritizedIssues;
    return prioritizedIssues.filter(item => item.priorityLevel === selectedPriority);
  }, [prioritizedIssues, selectedPriority]);

  const itemsPerPage = 3;
  const maxIndex = Math.max(0, filteredIssues.length - itemsPerPage);

  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - itemsPerPage));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(maxIndex, prev + itemsPerPage));
  };

  const visibleIssues = useMemo(() => {
    return filteredIssues.slice(currentIndex, currentIndex + itemsPerPage);
  }, [filteredIssues, currentIndex, itemsPerPage]);

  const getPriorityStyle = (level) => {
    switch (level) {
      case 'P0':
        return {
          badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          card: 'border-slate-200/90 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800 bg-white dark:bg-slate-900',
          text: 'text-rose-600 dark:text-rose-400'
        };
      case 'P1':
        return {
          badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          card: 'border-slate-200/90 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800 bg-white dark:bg-slate-900',
          text: 'text-amber-600 dark:text-amber-400'
        };
      case 'P2':
        return {
          badge: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          card: 'border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 bg-white dark:bg-slate-900',
          text: 'text-indigo-600 dark:text-indigo-400'
        };
      default:
        return {
          badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          card: 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900',
          text: 'text-slate-600 dark:text-slate-400'
        };
    }
  };

  if (prioritizedIssues.length === 0) return null;

  return (
    <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-5">
      {/* Evidence Modal */}
      <RagEvidenceDrawer
        isOpen={isEvidenceOpen}
        onClose={() => setIsEvidenceOpen(false)}
        topicName={selectedTopicForEvidence}
      />

      {/* Top Header: Title, Priority Filter Badges & Pagination Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>Executive Priority Action Queue</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Ranked critical friction drivers, SLA risks, and automated intervention guidance
            </p>
          </div>
        </div>

        {/* Priority Filter Slicers & Carousel Pagers */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Priority Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
            {['ALL', 'P0', 'P1', 'P2', 'P3'].map((prio) => (
              <button
                key={prio}
                onClick={() => {
                  setSelectedPriority(prio);
                  setCurrentIndex(0);
                }}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedPriority === prio
                    ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {prio}
              </button>
            ))}
          </div>

          {/* Previous / Next Small Box Navigation Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 px-2 select-none">
              {currentIndex + 1}–{Math.min(filteredIssues.length, currentIndex + itemsPerPage)} of {filteredIssues.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              className="p-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Small Box Metrics Grid: 3 Compact Cards Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visibleIssues.map((issue) => {
          const style = getPriorityStyle(issue.priorityLevel);

          return (
            <div
              key={issue.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${style.card}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${style.badge}`}>
                    {issue.priority}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                    {issue.source}
                  </span>
                </div>

                <h4 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2 min-h-[40px] leading-snug" title={issue.title}>
                  {issue.title}
                </h4>
              </div>

              {/* Metric Badges */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Volume</span>
                  <span className="text-slate-900 dark:text-white font-semibold text-xs">{(issue.volume ?? 0).toLocaleString()} msgs</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Friction</span>
                  <span className={`font-semibold text-xs ${style.text}`}>{(issue.frictionRate ?? 0).toFixed(1)}% Neg</span>
                </div>
              </div>

              {/* Action Recommendation */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                <div className="flex items-center gap-1 text-slate-900 dark:text-slate-200 font-semibold text-[11px]">
                  <Zap className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Recommendation</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                  {issue.action}
                </p>
              </div>

              {/* Bottom Trigger: Inspect RAG Grounded Evidence */}
              <button
                onClick={() => {
                  setSelectedTopicForEvidence(issue.title);
                  setIsEvidenceOpen(true);
                }}
                className="w-full py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700 transition-all text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>View Real Verbatims</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PriorityActionBoard;
