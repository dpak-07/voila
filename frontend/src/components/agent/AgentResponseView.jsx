import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  RadialBarChart, RadialBar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
  Legend
} from 'recharts';
import {
  Sparkles, Check, Copy, ThumbsUp, ThumbsDown,
  TrendingUp, TrendingDown, AlertTriangle, Clock,
  BarChart2, Activity, Target, Users, Zap, Shield
} from 'lucide-react';

/* ─────────────────────────── Inline Markdown ─────────────────────────── */
function InlineFormatter({ text = '' }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={i} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-xs text-indigo-700 font-semibold">{part.slice(1, -1)}</code>;
        return part;
      })}
    </>
  );
}

export function FormattedMarkdown({ text = '' }) {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-2.5 text-slate-800 text-sm font-sans leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        if (trimmed.startsWith('### '))
          return (
            <h4 key={idx} className="font-display font-bold text-sm text-slate-900 pt-2 pb-0.5 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>{trimmed.replace('### ', '')}</span>
            </h4>
          );

        if (trimmed.startsWith('## ') || trimmed.startsWith('# '))
          return (
            <h3 key={idx} className="font-display font-extrabold text-base text-slate-900 pt-3 pb-1">
              {trimmed.replace(/^#+\s*/, '')}
            </h3>
          );

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.replace(/^[-*]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-[7px]" />
              <div className="flex-1 text-slate-700"><InlineFormatter text={content} /></div>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch)
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1 pt-0.5">
              <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 font-mono text-[10px] font-bold text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                {numMatch[1]}
              </span>
              <div className="flex-1 text-slate-800 font-medium pt-0.5"><InlineFormatter text={numMatch[2]} /></div>
            </div>
          );

        return (
          <p key={idx} className="text-slate-700 leading-relaxed">
            <InlineFormatter text={trimmed} />
          </p>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── Smart Chart Engine ─────────────────────────── */

/** Detect which chart type best fits the query + context */
function detectChartType(question = '', queryType = '', context = {}) {
  const q = question.toLowerCase();
  const analytics = context?.analytics || context || {};
  const topics = analytics?.customer_pain_points || analytics?.topic_summaries || [];
  const kpis = analytics?.kpi_metrics || context?.kpis || null;

  if (q.includes('pain point') || q.includes('complaint') || q.includes('topic') || q.includes('cluster') ||
      q.includes('category') || q.includes('issue') || queryType === 'customer_pain_points') {
    return topics.length > 0 ? 'topic_bars' : null;
  }
  if (q.includes('sentiment') || q.includes('tone') || q.includes('positive') || q.includes('negative')) {
    return kpis ? 'sentiment_donut' : null;
  }
  if (q.includes('response time') || q.includes('sla') || q.includes('latency')) {
    return topics.length > 0 ? 'response_time_bars' : (kpis ? 'kpi_gauge' : null);
  }
  if (q.includes('resolution') || q.includes('reopen') || q.includes('fcr') || q.includes('escalation')) {
    return kpis ? 'kpi_radial' : null;
  }
  if (q.includes('kpi') || q.includes('metric') || q.includes('dashboard') || q.includes('summary') || q.includes('overview')) {
    return kpis ? 'kpi_grid' : null;
  }
  if (q.includes('p0') || q.includes('p1') || q.includes('critical') || q.includes('priority')) {
    return topics.length > 0 ? 'priority_heatmap' : null;
  }
  // Default: if we have topics, show them; if only KPIs, show gauges
  if (topics.length > 0) return 'topic_bars';
  if (kpis) return 'kpi_grid';
  return null;
}

const PALETTE = ['#4f46e5', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];
const NEG_COLOR = '#ef4444';
const POS_COLOR = '#10b981';
const INDIGO = '#4f46e5';

function SmartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white rounded-xl p-3 text-xs shadow-2xl border border-slate-700 max-w-[220px]">
      {label && <p className="font-bold text-slate-200 mb-1.5 truncate">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2 mt-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className="text-slate-300">{entry.name}:</span>
          <span className="font-bold">{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</span>
        </p>
      ))}
    </div>
  );
}

/* Topic Volume Horizontal Bar */
function TopicBarsChart({ topics }) {
  const data = topics.slice(0, 7).map((t, i) => ({
    name: (t.cluster_name || t.topic_keywords || `Topic ${i + 1}`).replace(' Inquiries', '').slice(0, 28),
    full: t.cluster_name || t.topic_keywords || '',
    volume: Number(t.volume || t.count || 0),
    neg: Number(t.negative_sentiment_percentage || 0).toFixed(1),
    negCount: Number(t.negative_complaints || 0),
    fill: PALETTE[i % PALETTE.length],
  }));

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wide">Top Complaint Themes · Volume</p>
      <div style={{ height: Math.max(180, data.length * 38) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10, fill: '#475569', fontFamily: 'sans-serif' }} axisLine={false} tickLine={false} />
            <Tooltip content={<SmartTooltip />} />
            <Bar dataKey="volume" name="Cases" radius={[0, 6, 6, 0]} minPointSize={4}>
              {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* Sentiment Donut */
function SentimentDonut({ kpis }) {
  const pos = Number(kpis.positive_sentiment_percentage || 0);
  const neg = Number(kpis.negative_sentiment_percentage || 0);
  const neu = Math.max(0, 100 - pos - neg);
  const data = [
    { name: 'Positive', value: pos, color: POS_COLOR },
    { name: 'Negative', value: neg, color: NEG_COLOR },
    { name: 'Neutral', value: parseFloat(neu.toFixed(1)), color: '#94a3b8' },
  ].filter(d => d.value > 0);

  return (
    <div className="flex items-center gap-6">
      <div className="shrink-0" style={{ width: 140, height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3} dataKey="value">
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(val) => [`${val}%`]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2.5 flex-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
              <span className="text-xs text-slate-600 font-medium">{d.name}</span>
            </div>
            <span className="text-sm font-bold font-mono" style={{ color: d.color }}>{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Response Time Bars */
function ResponseTimeBarsChart({ topics }) {
  const data = topics.slice(0, 6).map((t, i) => ({
    name: (t.cluster_name || t.topic_keywords || `Topic ${i + 1}`).replace(' Inquiries', '').slice(0, 24),
    sla: Number(t.avg_response_time || 0).toFixed(1),
  }));

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wide">Avg Response Time by Category (minutes)</p>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }} axisLine={false} tickLine={false} unit="m" />
            <Tooltip content={<SmartTooltip />} />
            <Bar dataKey="sla" name="Avg Response (min)" radius={[6, 6, 0, 0]} fill={INDIGO} minPointSize={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* KPI Radial Bars */
function KpiRadialChart({ kpis }) {
  const metrics = [
    { name: 'Resolution', value: Number(kpis.resolution_rate || 0), color: POS_COLOR, fill: '#dcfce7' },
    { name: 'Escalation', value: Number(kpis.escalation_rate || 0), color: NEG_COLOR, fill: '#fee2e2' },
    { name: 'Reopen', value: Number(kpis.reopen_rate || 0), color: '#f59e0b', fill: '#fef9c3' },
    { name: 'CSAT', value: Number(kpis.csat_proxy || 0), color: INDIGO, fill: '#e0e7ff' },
  ].filter(m => m.value > 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {metrics.map((m, i) => (
        <div key={i} className="rounded-xl p-3 text-center" style={{ background: m.fill }}>
          <div className="text-xl font-black font-mono" style={{ color: m.color }}>{m.value.toFixed(1)}%</div>
          <div className="text-[10px] font-semibold text-slate-600 mt-0.5 uppercase tracking-wide">{m.name}</div>
        </div>
      ))}
    </div>
  );
}

/* Priority Heatmap-style bars */
function PriorityHeatmapChart({ topics }) {
  const data = topics.slice(0, 8).map((t, i) => {
    const vol = Number(t.volume || 0);
    const negPct = Number(t.negative_sentiment_percentage || 0);
    const painScore = Number(t.pain_score || (vol * negPct / 100)).toFixed(0);
    return {
      name: (t.cluster_name || t.topic_keywords || '').replace(' Inquiries', '').slice(0, 26),
      pain: Number(painScore),
      volume: vol,
      neg: negPct,
      fill: negPct > 30 ? NEG_COLOR : negPct > 15 ? '#f59e0b' : POS_COLOR,
    };
  }).sort((a, b) => b.pain - a.pain);

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wide">Priority Score by Category</p>
      <div style={{ height: Math.max(160, data.length * 34) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 50, top: 4, bottom: 4 }}>
            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
            <Tooltip content={<SmartTooltip />} />
            <Bar dataKey="pain" name="Pain Score" radius={[0, 6, 6, 0]} minPointSize={4}>
              {data.map((d, i) => <Cell key={i} fill={d.fill} fillOpacity={0.9} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* KPI Summary Grid */
function KpiGridView({ kpis }) {
  const metrics = [
    { label: 'Conversations', value: (kpis.total_conversations || kpis.total_records || 0).toLocaleString(), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
    { label: 'Resolution Rate', value: `${Number(kpis.resolution_rate || 0).toFixed(1)}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Response SLA', value: `${Number(kpis.avg_response_time_minutes || 0).toFixed(1)}m`, icon: Clock, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
    { label: 'Escalation Rate', value: `${Number(kpis.escalation_rate || 0).toFixed(1)}%`, icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
    { label: 'Negative Share', value: `${Number(kpis.negative_sentiment_percentage || 0).toFixed(1)}%`, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
    { label: 'CSAT Proxy', value: `${Number(kpis.csat_proxy || kpis.positive_sentiment_percentage || 0).toFixed(1)}%`, icon: Zap, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
  ].filter(m => m.value !== '0.0%' && m.value !== '0.0m');

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {metrics.map((m, i) => {
        const Icon = m.icon;
        return (
          <div key={i} className={`flex items-center gap-2.5 p-3 rounded-xl border ${m.bg}`}>
            <Icon className={`w-4 h-4 shrink-0 ${m.color}`} />
            <div>
              <div className={`text-base font-black font-mono ${m.color}`}>{m.value}</div>
              <div className="text-[10px] text-slate-500 font-medium leading-tight">{m.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── Main Response View ─────────────────────────── */
export function AgentResponseView({ response }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!response) return null;

  const { answer = '', context = {}, query_type = '', question = '' } = response;

  // Extract data from various context shapes
  const analytics = context?.analytics || {};
  const kpis = analytics?.kpi_metrics || context?.kpi_metrics || context?.kpis || null;
  const topics = analytics?.customer_pain_points || analytics?.topic_summaries ||
                 context?.customer_pain_points || context?.topic_summaries || [];

  const enrichedContext = { ...context, analytics: { ...analytics, kpi_metrics: kpis, customer_pain_points: topics } };

  // Smart chart type detection based on actual query intent
  const chartType = useMemo(() => detectChartType(question, query_type, enrichedContext), [question, query_type]);

  const handleCopy = () => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine if we should show a chart inline
  const hasChart = chartType !== null &&
    ((chartType === 'topic_bars' || chartType === 'response_time_bars' || chartType === 'priority_heatmap') && topics.length > 0) ||
    ((chartType === 'sentiment_donut' || chartType === 'kpi_radial' || chartType === 'kpi_grid' || chartType === 'kpi_gauge') && kpis);

  return (
    <div className="space-y-4">
      {/* Answer Text */}
      <div className="text-slate-800 text-sm leading-relaxed">
        <FormattedMarkdown text={answer} />
      </div>

      {/* ── Smart Chart (auto-shown, not behind toggle) ── */}
      {hasChart && (
        <div className="mt-1 rounded-2xl bg-white border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <BarChart2 className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wide">
              Data Visualization · {query_type?.replace(/_/g, ' ') || 'Analytics'}
            </span>
          </div>

          {/* KPI Scorecard (always shown if available for this query type) */}
          {kpis && (chartType === 'kpi_grid' || chartType === 'kpi_radial') && <KpiGridView kpis={kpis} />}

          {/* Query-specific chart */}
          {chartType === 'topic_bars' && topics.length > 0 && <TopicBarsChart topics={topics} />}
          {chartType === 'response_time_bars' && topics.length > 0 && <ResponseTimeBarsChart topics={topics} />}
          {chartType === 'sentiment_donut' && kpis && <SentimentDonut kpis={kpis} />}
          {chartType === 'kpi_radial' && kpis && <KpiRadialChart kpis={kpis} />}
          {chartType === 'priority_heatmap' && topics.length > 0 && <PriorityHeatmapChart topics={topics} />}

          {/* When we have both topics and kpis for pain points, show quick KPI mini-row too */}
          {chartType === 'topic_bars' && kpis && (
            <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-100 mt-1">
              {[
                { label: 'Total', value: (kpis.total_conversations || kpis.total_records || 0).toLocaleString(), color: 'text-indigo-600' },
                { label: 'Resolution', value: `${Number(kpis.resolution_rate || 0).toFixed(1)}%`, color: 'text-emerald-600' },
                { label: 'Avg SLA', value: `${Number(kpis.avg_response_time_minutes || 0).toFixed(1)}m`, color: 'text-slate-700' },
                { label: 'Neg Share', value: `${Number(kpis.negative_sentiment_percentage || 0).toFixed(1)}%`, color: 'text-rose-600' },
              ].map((m, i) => (
                <div key={i} className="text-center">
                  <div className={`text-sm font-black font-mono ${m.color}`}>{m.value}</div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wide font-semibold">{m.label}</div>
                </div>
              ))}
            </div>
          )}

          {chartType === 'priority_heatmap' && kpis && (
            <div className="flex items-center gap-3 pt-1 border-t border-slate-100 text-[11px] font-mono">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> High friction (&gt;30% neg)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Medium (15–30%)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Low (&lt;15%)</span>
            </div>
          )}
        </div>
      )}

      {/* Action Toolbar */}
      <div className="flex items-center gap-1 pt-0.5">
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
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setFeedback('down')}
          className={`p-1.5 rounded-lg transition-colors ${feedback === 'down' ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
