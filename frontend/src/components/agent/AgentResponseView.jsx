import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Layers,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Flame,
  MessageSquare,
  ArrowUpRight,
  Target
} from 'lucide-react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';

// Helper to render markdown text with bolding, code, and lists
export function FormattedMarkdown({ text = '' }) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="space-y-2.5 text-zinc-800 text-xs sm:text-sm font-sans leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // H3 Header
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-display font-bold text-sm sm:text-base text-zinc-900 pt-2 pb-1 border-b border-zinc-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-zinc-800 shrink-0" />
              <span>{trimmed.replace('### ', '')}</span>
            </h4>
          );
        }

        // H2 / H1 Header
        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          return (
            <h3 key={idx} className="font-display font-extrabold text-base sm:text-lg text-zinc-900 pt-3 pb-1 flex items-center gap-2">
              <span>{trimmed.replace(/^#+\s*/, '')}</span>
            </h3>
          );
        }

        // Bullet point
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.replace(/^[-*]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0 mt-2" />
              <div className="flex-1 text-zinc-800">
                <InlineFormatter text={content} />
              </div>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 pt-1">
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-mono text-[10px] font-bold text-zinc-800 shrink-0 mt-0.5">
                {numMatch[1]}
              </span>
              <div className="flex-1 text-zinc-900 font-medium">
                <InlineFormatter text={numMatch[2]} />
              </div>
            </div>
          );
        }

        // Standard paragraph
        return (
          <p key={idx} className="text-zinc-700">
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
            <strong key={pIdx} className="font-bold text-zinc-950">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={pIdx} className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-mono text-xs text-zinc-900">
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
  const [selectedTopic, setSelectedTopic] = useState(null);

  if (!response) return null;

  const {
    question = '',
    status = 'success',
    query_type = 'general',
    answer = '',
    context = {},
    data_confidence = 'measured',
    citations = []
  } = response;

  // Extract structured artifacts from context
  const kpis = context?.kpi_metrics || context?.kpis || context?.analytics?.kpi_metrics || null;
  const topics = context?.customer_pain_points || context?.topic_summaries || context?.analytics?.customer_pain_points || [];
  const sentiment = context?.sentiment_distribution || context?.analytics?.sentiment_distribution || null;
  const comparison = context?.comparison_summary || null;

  // Chart data for topic friction
  const topicChartData = Array.isArray(topics) && topics.length > 0 ? topics.slice(0, 5).map((t, i) => ({
    name: (t.cluster_name || t.topic_keywords || `Topic #${i+1}`).slice(0, 20),
    fullName: t.cluster_name || t.topic_keywords || `Topic #${i+1}`,
    volume: Number(t.volume || t.count || 0),
    negativeCount: Number(t.negative_complaints || 0),
    negativeRate: Number(t.negative_sentiment_percentage || (t.volume ? (t.negative_complaints / t.volume * 100).toFixed(1) : 0)),
    latency: Number(t.avg_response_time || 0).toFixed(1),
    quotes: t.sample_conversations || []
  })) : [];

  return (
    <div className="space-y-6">
      {/* Header: Question + Classification + Confidence */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200">
        <div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-semibold">
            Evaluated Agent Query:
          </span>
          <h4 className="font-display font-extrabold text-base sm:text-lg text-zinc-900 mt-0.5">
            "{question}"
          </h4>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-bold uppercase tracking-wider border ${
              status === 'success'
                ? 'bg-zinc-100 text-zinc-900 border-zinc-300'
                : status === 'insufficient_data'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {query_type ? query_type.replace(/_/g, ' ') : status}
          </span>

          <ConfidenceBadge
            confidence={data_confidence || (status === 'insufficient_data' ? 'no_data_available' : 'measured')}
            size="sm"
          />
        </div>
      </div>

      {/* 1. Real KPI Metric Tiles (if KPIs exist in context) */}
      {kpis && (kpis.total_conversations > 0 || kpis.total_records > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 shadow-2xs">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Total Ingested</span>
            <span className="text-base sm:text-lg font-bold text-zinc-900">
              {(kpis.total_conversations || kpis.total_records || 0).toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 shadow-2xs">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Resolution Rate</span>
            <span className="text-base sm:text-lg font-bold text-emerald-600">
              {(kpis.resolution_rate || 0).toFixed(1)}%
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 shadow-2xs">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Mean Latency</span>
            <span className="text-base sm:text-lg font-bold text-zinc-900">
              {(kpis.avg_response_time_minutes || 0).toFixed(1)}m
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 shadow-2xs">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Negative Tone</span>
            <span className="text-base sm:text-lg font-bold text-rose-600">
              {(kpis.negative_sentiment_percentage || 0).toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* 2. Structured Narrative Response (Formatted Markdown) */}
      <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 shadow-2xs">
        <FormattedMarkdown text={answer} />
      </div>

      {/* 3. Live Topic Friction Visual Breakdown & Interactive Chart */}
      {topicChartData.length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-zinc-900" />
              <h4 className="font-display font-bold text-sm text-zinc-900">
                Top Complaint Themes Breakdown
              </h4>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 font-semibold">
              {topicChartData.length} clusters isolated
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-center">
            {/* Horizontal Bar Visualization */}
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topicChartData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#71717a"
                    fontSize={10}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="p-2.5 rounded-xl bg-white border border-zinc-200 shadow-xl font-mono text-xs text-zinc-900">
                            <p className="font-bold border-b border-zinc-200 pb-1 mb-1">{d.fullName}</p>
                            <p>Volume: <strong className="text-zinc-900">{d.volume.toLocaleString()} msgs</strong></p>
                            <p className="text-rose-600">Negative Tone: <strong>{d.negativeRate}%</strong></p>
                            <p className="text-zinc-600">Latency: <strong>{d.latency}m</strong></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
                    {topicChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.negativeRate > 30 ? '#e11d48' : '#18181b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Interactive Topic Cards */}
            <div className="space-y-2 font-mono text-xs">
              {topicChartData.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedTopic(selectedTopic?.fullName === item.fullName ? null : item)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedTopic?.fullName === item.fullName
                      ? 'bg-zinc-100 border-zinc-400 shadow-xs'
                      : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-zinc-900 capitalize truncate">
                      {idx + 1}. {item.fullName}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 text-[10px] font-bold">
                        {item.volume.toLocaleString()} msgs
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.negativeRate > 30 ? 'bg-rose-100 text-rose-700' : 'bg-zinc-100 text-zinc-700'
                      }`}>
                        {item.negativeRate}% Neg
                      </span>
                    </div>
                  </div>

                  {/* Expanded Quote Preview */}
                  {selectedTopic?.fullName === item.fullName && item.quotes.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-zinc-200 space-y-1.5">
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold">
                        Sample Verbatim Customer Quote:
                      </span>
                      <p className="text-[11px] text-zinc-800 italic bg-white p-2 rounded border border-zinc-200">
                        "{item.quotes[0].text}"
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Verbatim Evidence Quotes */}
      {Array.isArray(citations) && citations.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-mono text-zinc-600 uppercase tracking-wider font-bold block">
            Grounded Customer Evidence Citations ({citations.length}):
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {citations.map((cite, cIdx) => (
              <div
                key={cIdx}
                className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-mono text-zinc-700 shadow-2xs"
              >
                <p className="italic text-zinc-900">"{cite.text || cite.content || cite}"</p>
                {cite.author_id && (
                  <span className="text-[10px] text-zinc-500 block mt-1.5 font-semibold">
                    Author: @{cite.author_id} {cite.sentiment && `· Sentiment: ${cite.sentiment}`}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentResponseView;
