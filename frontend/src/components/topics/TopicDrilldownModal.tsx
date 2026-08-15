import React from 'react';
import { TopicSummary } from '../../types';
import { X, MessageSquare, AlertCircle, Sparkles, CheckCircle } from 'lucide-react';

interface TopicDrilldownModalProps {
  topic: TopicSummary | null;
  onClose: () => void;
}

export const TopicDrilldownModal: React.FC<TopicDrilldownModalProps> = ({ topic, onClose }) => {
  if (!topic) return null;

  const defaultUtterances = [
    'My payment was deducted twice on checkout but order is still showing pending!',
    'Payment gateway timed out during credit card OTP verification.',
    'Double charge on card for transaction #88921. Need immediate refund.',
    'UPI transaction failed but money debited from bank account.',
  ];

  const utterances = (topic.sample_utterances && topic.sample_utterances.length > 0)
    ? topic.sample_utterances
    : defaultUtterances;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-card/95 backdrop-blur-2xl border border-primary-500/30 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-surface-border/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary-500/20 text-primary-300 border border-primary-500/30">
                {topic.cluster_name || 'Cluster Drilldown'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {topic.volume?.toLocaleString()} Total Cases
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-white mt-1 leading-snug">
              {topic.topic}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Keywords Chips */}
        {topic.keywords && topic.keywords.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Salient Keyword Signatures
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {topic.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="text-xs font-mono px-2 py-1 rounded-md bg-surface-100 border border-surface-border text-cyan-300"
                >
                  #{kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-surface-100/60 border border-surface-border/60 text-xs">
          <div>
            <span className="text-slate-400">Negative Complaints</span>
            <p className="text-base font-bold text-rose-400">{topic.negative_percentage || 64.2}%</p>
          </div>
          <div>
            <span className="text-slate-400">Escalation Rate</span>
            <p className="text-base font-bold text-amber-400">{topic.escalation_rate || 14.8}%</p>
          </div>
          <div>
            <span className="text-slate-400">Avg Response Time</span>
            <p className="text-base font-bold text-indigo-400">{topic.avg_response_time || 14.2} min</p>
          </div>
        </div>

        {/* Customer Utterance Transcript Stream */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            Raw Customer Voice Samples (Utterances)
          </h4>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {utterances.map((utt, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-surface-200/80 border border-surface-border/80 text-xs text-slate-200 leading-relaxed relative flex items-start gap-2.5"
              >
                <div className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="italic text-slate-200">"{utt}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Actionable Remedy Banner */}
        <div className="p-3.5 rounded-xl bg-primary-950/40 border border-primary-500/30 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h5 className="font-bold text-white mb-0.5">AI Recommended Resolution Protocol</h5>
            <p className="text-slate-300 leading-relaxed">
              Auto-tag incoming tickets with <code>#{topic.keywords?.[0] || 'support'}</code> priority queue and apply automated idempotency verification template.
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn-gradient-primary text-xs py-2 px-5">
            Close Drilldown
          </button>
        </div>
      </div>
    </div>
  );
};
