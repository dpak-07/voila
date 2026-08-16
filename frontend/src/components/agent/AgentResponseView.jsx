import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import {
  Sparkles,
  Check,
  Copy,
  Target,
  ChevronDown,
  ChevronUp,
  BarChart2,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

// Helper to render markdown text with natural typography
export function FormattedMarkdown({ text = '' }) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="space-y-3 text-slate-800 text-sm font-sans leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // H3 Header
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-display font-bold text-base text-slate-900 pt-2 pb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{trimmed.replace('### ', '')}</span>
            </h4>
          );
        }

        // H2 / H1 Header
        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          return (
            <h3 key={idx} className="font-display font-extrabold text-lg text-slate-900 pt-3 pb-1">
              {trimmed.replace(/^#+\s*/, '')}
            </h3>
          );
        }

        // Bullet point
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.replace(/^[-*]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0 mt-2" />
              <div className="flex-1 text-slate-700">
                <InlineFormatter text={content} />
              </div>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-2 pt-0.5">
              <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 font-mono text-[11px] font-bold text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                {numMatch[1]}
              </span>
              <div className="flex-1 text-slate-800 font-medium pt-0.5">
                <InlineFormatter text={numMatch[2]} />
              </div>
            </div>
          );
        }

        // Standard paragraph
        return (
          <p key={idx} className="text-slate-700 leading-relaxed">
            <InlineFormatter text={trimmed} />
          </p>
        );
      })}
    </div>
  );
}

function InlineFormatter({ text = '' }) {
  // Regex to match bold **text** and code `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return (
    <>
      {parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-bold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={pIdx} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-xs text-indigo-700 font-semibold">
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </>
  );
}

export function AgentResponseView({ response }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showCharts, setShowCharts] = useState(false);

  if (!response) return null;

  const {
    answer = '',
    context = {},
  } = response;

  const handleCopy = () => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract structured artifacts from context if available
  const kpis = context?.kpi_metrics || context?.kpis || context?.analytics?.kpi_metrics || null;
  const topics = context?.customer_pain_points || context?.topic_summaries || context?.analytics?.customer_pain_points || [];

  const topicChartData = Array.isArray(topics) && topics.length > 0 ? topics.slice(0, 5).map((t, i) => ({
    name: (t.cluster_name || t.topic_keywords || `Topic #${i+1}`).slice(0, 22),
    fullName: t.cluster_name || t.topic_keywords || `Topic #${i+1}`,
    volume: Number(t.volume || t.count || 0),
    negativeCount: Number(t.negative_complaints || 0),
    negativeRate: Number(t.negative_sentiment_percentage || (t.volume ? (t.negative_complaints / t.volume * 100).toFixed(1) : 0)),
    latency: Number(t.avg_response_time || 0).toFixed(1),
  })) : [];

  const hasTelemetry = (kpis && (kpis.total_conversations > 0 || kpis.total_records > 0)) || topicChartData.length > 0;

  return (
    <div className="space-y-3.5">
      {/* Natural AI Message Body */}
      <div className="text-slate-800 text-sm leading-relaxed">
        <FormattedMarkdown text={answer} />
      </div>

      {/* Optional Telemetry Accordion (clean collapsible, ChatGPT/Gemini style) */}
      {hasTelemetry && (
        <div className="pt-2">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-mono font-medium text-slate-700 transition-all"
          >
            <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>{showCharts ? 'Hide Visual Telemetry' : 'View Data Telemetry & Charts'}</span>
            {showCharts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showCharts && (
            <div className="mt-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4">
              {kpis && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase block">Conversations</span>
                    <span className="text-sm font-bold text-slate-900">
                      {(kpis.total_conversations || kpis.total_records || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase block">Resolution Rate</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {(kpis.resolution_rate || 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase block">Response SLA</span>
                    <span className="text-sm font-bold text-slate-900">
                      {(kpis.avg_response_time_minutes || 0).toFixed(1)}m
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase block">Negative Share</span>
                    <span className="text-sm font-bold text-rose-600">
                      {(kpis.negative_sentiment_percentage || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              {topicChartData.length > 0 && (
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Top Complaint Themes by Volume</span>
                  </div>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topicChartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10, fill: '#475569' }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="p-2 bg-slate-900 text-white rounded-lg text-xs shadow-lg">
                                  <p className="font-bold">{d.fullName}</p>
                                  <p>{d.volume.toLocaleString()} cases ({d.negativeRate}% negative)</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="volume" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Toolbar (Copy, Feedback) */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs"
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied && <span className="text-emerald-600 text-[11px] font-mono">Copied</span>}
        </button>

        <button
          onClick={() => setFeedback('up')}
          className={`p-1.5 rounded-lg transition-colors ${feedback === 'up' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
          title="Helpful response"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setFeedback('down')}
          className={`p-1.5 rounded-lg transition-colors ${feedback === 'down' ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
          title="Not helpful"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
