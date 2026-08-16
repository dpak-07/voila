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
          priority: 'P0 – CRITICAL',
          priorityLevel: 'P0',
          title,
          category: 'Velocity Surge & Anomaly',
          frictionRate: friction,
          volume: vol,
          slaImpact: item.sla_impact || null,
          action: item.recommended_action || null,
          source: 'Z-Score Spike Detector',
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

        let priority = 'P2 – MEDIUM';
        let priorityLevel = 'P2';

        if (vol > 10000 || (friction != null && friction > 30)) {
          priority = 'P0 – CRITICAL';
          priorityLevel = 'P0';
        } else if (vol > 5000 || (friction != null && friction > 22)) {
          priority = 'P1 – HIGH';
          priorityLevel = 'P1';
        } else if (vol > 0) {
          priority = 'P3 – LOW';
          priorityLevel = 'P3';
        }

        rawList.push({
          id: `pain-${idx}`,
          priority,
          priorityLevel,
          title,
          category: item.category || 'Customer Experience Friction',
          frictionRate: friction,
          volume: vol,
          slaImpact: item.sla_impact || item.avg_response_time_minutes != null ? `${Math.round(item.avg_response_time_minutes || 0)}m avg response` : null,
          action: item.recommended_action || null,
          source: 'Semantic BERTopic Engine',
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
    return unique.sort((a, b) => (order[a.priorityLevel] ?? 4) - (order[b.priorityLevel] ?? 4));
  }, [painPoints, emergingIssues]);

  // Filter items based on selected priority level pill
  const filteredIssues = useMemo(() => {
    if (selectedPriority === 'ALL') return prioritizedIssues;
    return prioritizedIssues.filter((i) => i.priorityLevel === selectedPriority);
  }, [prioritizedIssues, selectedPriority]);

  const itemsPerPage = 3;
  const maxIndex = Math.max(0, filteredIssues.length - itemsPerPage);
  const visibleIssues = filteredIssues.slice(currentIndex, currentIndex + itemsPerPage);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  const getPriorityStyle = (level) => {
    switch (level) {
      case 'P0':
        return {
          badge: 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-500 shadow-md shadow-rose-500/20',
          card: 'border-rose-200/90 dark:border-rose-500/30 bg-gradient-to-b from-rose-50/70 via-white/90 to-rose-50/30 dark:from-rose-950/25 dark:via-slate-900/60 dark:to-slate-950/80 shadow-md shadow-rose-500/5',
          text: 'text-rose-600 dark:text-rose-400',
        };
      case 'P1':
        return {
          badge: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400 shadow-md shadow-amber-500/20',
          card: 'border-amber-200/90 dark:border-amber-500/30 bg-gradient-to-b from-amber-50/70 via-white/90 to-amber-50/30 dark:from-amber-950/25 dark:via-slate-900/60 dark:to-slate-950/80 shadow-md shadow-amber-500/5',
          text: 'text-amber-600 dark:text-amber-400',
        };
      case 'P2':
        return {
          badge: 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20',
          card: 'border-indigo-200/90 dark:border-indigo-500/30 bg-gradient-to-b from-indigo-50/70 via-white/90 to-indigo-50/30 dark:from-indigo-950/25 dark:via-slate-900/60 dark:to-slate-950/80 shadow-md shadow-indigo-500/5',
          text: 'text-indigo-600 dark:text-indigo-400',
        };
      default:
        return {
          badge: 'bg-slate-700 text-white border-slate-600 shadow-xs',
          card: 'border-slate-200/90 dark:border-white/10 bg-gradient-to-b from-slate-50/70 via-white/90 to-slate-50/30 dark:from-slate-900/60 dark:to-slate-950/80 shadow-xs',
          text: 'text-slate-700 dark:text-slate-300',
        };
    }
  };

  return (
    <div className="p-6 rounded-3xl glass-card space-y-5">
      {/* Evidence Modal */}
      <RagEvidenceDrawer
        isOpen={isEvidenceOpen}
        onClose={() => setIsEvidenceOpen(false)}
        topicName={selectedTopicForEvidence}
      />

      {/* Top Header: Title, Priority Filter Badges & Pagination Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-600 text-white shadow-md shadow-rose-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>Executive Priority Action Queue</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                P0–P3 Triage Matrix
              </span>
            </h3>
            <p className="text-xs font-sans text-slate-500 dark:text-slate-400 font-medium">
              Ranked critical friction drivers, SLA risks, and automated intervention guidance
            </p>
          </div>
        </div>

        {/* Priority Filter Slicers & Carousel Pagers */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Priority Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-white/[0.04] p-1 rounded-2xl border border-slate-200 dark:border-white/10 text-xs font-mono shadow-2xs">
            {['ALL', 'P0', 'P1', 'P2', 'P3'].map((prio) => (
              <button
                key={prio}
                onClick={() => {
                  setSelectedPriority(prio);
                  setCurrentIndex(0);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedPriority === prio
                    ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {prio}
              </button>
            ))}
          </div>

          {/* Previous / Next Small Box Navigation Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.04] p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xs">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-1.5 rounded-xl bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Previous Priority Issues"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 px-2 select-none">
              {currentIndex + 1}–{Math.min(filteredIssues.length, currentIndex + itemsPerPage)} of {filteredIssues.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              className="p-1.5 rounded-xl bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Next Priority Issues"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Small Box Metrics Grid: 3 Compact Cards Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visibleIssues.map((issue) => {
          const style = getPriorityStyle(issue.priorityLevel);

          return (
            <motion.div
              key={issue.id}
              whileHover={{ y: -3 }}
              className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden backdrop-blur-xl ${style.card}`}
            >
              {/* Top row: Priority badge + Volume */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-xl text-[10px] font-black tracking-wider uppercase border shadow-2xs flex items-center gap-1.5 ${style.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full bg-white ${issue.priorityLevel === 'P0' ? 'animate-ping' : ''}`} />
                    {issue.priority}
                  </span>
                </div>

                <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white line-clamp-2 min-h-[40px] leading-snug" title={issue.title}>
                  {issue.title}
                </h4>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {issue.category} · {issue.source}
                </p>
              </div>

              {/* Small Metric Badges */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 dark:border-white/10 text-[11px]">
                <div className="bg-white/85 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xs">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">Volume:</span>
                  <strong className="text-slate-900 dark:text-white font-black text-xs">{issue.volume.toLocaleString()} msgs</strong>
                </div>
                <div className="bg-white/85 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xs">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">Friction Rate:</span>
                  <strong className={`font-black text-xs ${style.text}`}>{issue.frictionRate.toFixed(1)}% Neg</strong>
                </div>
              </div>

              {/* SLA & Actionable Recommendation */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="truncate">{issue.slaImpact}</span>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 bg-white/85 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-200/80 dark:border-white/10 font-medium line-clamp-2 shadow-2xs">
                  <strong className="text-slate-900 dark:text-white">Action:</strong> {issue.action}
                </p>
              </div>

              {/* Bottom Trigger: Inspect RAG Grounded Evidence */}
              <button
                onClick={() => {
                  setSelectedTopicForEvidence(issue.title);
                  setIsEvidenceOpen(true);
                }}
                className="w-full py-2 px-3 rounded-2xl bg-white/90 dark:bg-white/[0.06] hover:bg-white dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-all text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer"
              >
                <span>Inspect Verbatim Proof</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default PriorityActionBoard;
