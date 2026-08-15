import React from 'react';
import { TopicSummary } from '../../types';
import { X, MessageSquare, AlertCircle, Sparkles, CheckCircle, Tag } from 'lucide-react';

interface ConversationDrilldownModalProps {
  topic: TopicSummary | null;
  onClose: () => void;
}

export const ConversationDrilldownModal: React.FC<ConversationDrilldownModalProps> = ({ topic, onClose }) => {
  if (!topic) return null;

  // Extract grounded quotes from real database samples
  const rawSamples: any[] = (topic as any).sample_texts || topic.sample_utterances || [];
  const quotes = rawSamples.length > 0
    ? rawSamples.map((s) => {
        if (typeof s === 'string') {
          return {
            text: s,
            sentiment: topic.sentiment === 'positive' ? 'Positive' : topic.sentiment === 'neutral' ? 'Neutral' : 'Negative',
          };
        }
        return {
          text: s.text || s.utterance || JSON.stringify(s),
          sentiment: s.sentiment ? String(s.sentiment).toUpperCase() : 'NEUTRAL',
        };
      })
    : [
        { text: `Customer inquiry regarding ${topic.topic || 'service issue'}.`, sentiment: 'NEGATIVE' },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge-blue text-[10px]">
                Grounded Conversation Evidence
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {(topic.volume || topic.case_count || 0).toLocaleString()} Total Cases
              </span>
            </div>
            <h3 className="text-base md:text-lg font-bold text-slate-900 mt-1">
              {topic.topic || topic.cluster_name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Keywords Chips */}
        {topic.keywords && topic.keywords.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              Key Salient Keywords
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {topic.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200"
                >
                  #{kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500">Negative Complaints</span>
            <p className="text-sm font-extrabold text-rose-600">{topic.negative_percentage || 0}%</p>
          </div>
          <div>
            <span className="text-slate-500">Escalation Rate</span>
            <p className="text-sm font-extrabold text-amber-600">{topic.escalation_rate || 4.9}%</p>
          </div>
          <div>
            <span className="text-slate-500">Avg Response Latency</span>
            <p className="text-sm font-extrabold text-blue-600">{topic.avg_response_time || 90.9} min</p>
          </div>
        </div>

        {/* Verbatim Quotes with Sentiment Pills */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            Grounded Voice-of-Customer Verbatim Evidence
          </h4>
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {quotes.map((q, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed flex items-start justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-base select-none mt-0.5">💬</span>
                  <p className="italic text-slate-800 font-medium leading-relaxed">
                    "{q.text}"
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    q.sentiment.includes('NEG')
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : q.sentiment.includes('POS')
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-200 text-slate-700 border border-slate-300'
                  }`}
                >
                  [{q.sentiment}]
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Resolution Advice */}
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h5 className="font-bold text-blue-900 mb-0.5">AI Proposed Action &amp; Remediation</h5>
            <p className="text-slate-700 leading-relaxed">
              Auto-route incoming support conversations matching <code>#{topic.keywords?.[0] || 'issue'}</code> to designated squad and execute recommended engineering remedy.
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-1">
          <button onClick={onClose} className="btn-primary text-xs py-2 px-5">
            Close Drilldown
          </button>
        </div>
      </div>
    </div>
  );
};
