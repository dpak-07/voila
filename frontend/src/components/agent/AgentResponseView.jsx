import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import {
  Check, Copy, ThumbsUp, ThumbsDown,
  TrendingUp, TrendingDown, AlertTriangle, Clock,
  BarChart2, Activity, Target, Users, Zap,
  MessageSquare, Sparkles, ChevronDown, ChevronUp,
  ShieldCheck, Layers, ArrowRight
} from 'lucide-react';

/* ─────────────────────────── Animated Typewriter Hook ─────────────────────────── */
export function useTypewriter(text = '', speed = 8, isNew = true) {
  const [displayedText, setDisplayedText] = useState(isNew ? '' : text);
  const [isTyping, setIsTyping] = useState(isNew);

  useEffect(() => {
    if (!isNew || !text) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    setDisplayedText('');
    setIsTyping(true);

    let currentIndex = 0;
    const interval = setInterval(() => {
      // Stream in chunks of words for high performance
      currentIndex += 3;
      if (currentIndex >= text.length) {
        setDisplayedText(text);
        setIsTyping(false);
        clearInterval(interval);
      } else {
        setDisplayedText(text.slice(0, currentIndex));
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, isNew]);

  return { displayedText, isTyping, complete: () => setDisplayedText(text) };
}

/* ─────────────────────────── Inline Markdown ─────────────────────────── */
function InlineFormatter({ text = '' }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={i} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{part.slice(1, -1)}</code>;
        return part;
      })}
    </>
  );
}

export function FormattedMarkdown({ text = '', isTyping = false }) {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-2.5 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-sans leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        if (trimmed.startsWith('### '))
          return (
            <h4 key={idx} className="font-display font-bold text-sm text-slate-900 dark:text-white pt-2 pb-0.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>{trimmed.replace('### ', '')}</span>
            </h4>
          );

        if (trimmed.startsWith('## ') || trimmed.startsWith('# '))
          return (
            <h3 key={idx} className="font-display font-extrabold text-sm sm:text-base text-slate-900 dark:text-white pt-3 pb-1">
              {trimmed.replace(/^#+\s*/, '')}
            </h3>
          );

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.replace(/^[-*]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-[7px]" />
              <div className="flex-1 text-slate-700 dark:text-slate-300"><InlineFormatter text={content} /></div>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch)
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1 pt-0.5">
              <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 font-mono text-[10px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                {numMatch[1]}
              </span>
              <div className="flex-1 text-slate-800 dark:text-slate-200 font-medium pt-0.5"><InlineFormatter text={numMatch[2]} /></div>
            </div>
          );

        return (
          <p key={idx} className="text-slate-700 dark:text-slate-300 leading-relaxed">
            <InlineFormatter text={trimmed} />
            {isTyping && idx === lines.length - 1 && (
              <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-600 dark:bg-indigo-400 animate-pulse align-middle" />
            )}
          </p>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── Smart Chart Engine ─────────────────────────── */
const PALETTE = ['#4f46e5', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];
const NEG_COLOR = '#ef4444';
const POS_COLOR = '#10b981';
const INDIGO = '#4f46e5';

function SmartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-xl p-3 text-xs shadow-2xl border border-slate-700 max-w-[240px]">
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
  const data = topics.slice(0, 6).map((t, i) => ({
    name: (t.cluster_name || t.topic_keywords || `Topic ${i + 1}`).replace(' Inquiries', '').slice(0, 24),
    volume: Number(t.volume || t.count || 0),
    neg: Number(t.negative_sentiment_percentage || 0).toFixed(1),
    fill: PALETTE[i % PALETTE.length],
  }));

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        Topic Distribution · Conversation Volume
      </p>
      <div style={{ height: Math.max(160, data.length * 34) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 4, right: 30, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(200,200,200,0.15)" />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
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
      <div className="shrink-0" style={{ width: 130, height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={56} paddingAngle={3} dataKey="value">
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(val) => [`${val}%`]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2 flex-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{d.name}</span>
            </div>
            <span className="text-sm font-bold font-mono" style={{ color: d.color }}>{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* KPI Summary Grid */
function KpiGridView({ kpis }) {
  const metrics = [
    { label: 'Conversations', value: (kpis.total_conversations || kpis.total_records || 0).toLocaleString(), icon: Users, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-500/20' },
    { label: 'Resolution Rate', value: `${Number(kpis.resolution_rate || 0).toFixed(1)}%`, icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/20' },
    { label: 'Response SLA', value: `${Number(kpis.avg_response_time_minutes || 0).toFixed(1)}m`, icon: Clock, color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/10' },
    { label: 'Negative Share', value: `${Number(kpis.negative_sentiment_percentage || 0).toFixed(1)}%`, icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-500/20' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {metrics.map((m, i) => {
        const Icon = m.icon;
        return (
          <div key={i} className={`p-3 rounded-2xl border ${m.bg}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{m.label}</span>
              <Icon className={`w-3.5 h-3.5 ${m.color}`} />
            </div>
            <div className={`text-base font-black font-mono ${m.color}`}>{m.value}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── Main Response View with Tabs ─────────────────────────── */
export function AgentResponseView({ response, onPromptClick }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [activeTab, setActiveTab] = useState('synthesis');

  if (!response) return null;

  const { answer = '', context = {}, query_type = '', question = '', documents = [] } = response;
  const analytics = context?.analytics || {};
  const kpis = analytics?.kpi_metrics || context?.kpi_metrics || context?.kpis || null;
  const topics = analytics?.customer_pain_points || analytics?.topic_summaries ||
                 context?.customer_pain_points || context?.topic_summaries || [];

  const { displayedText, isTyping } = useTypewriter(answer, 6, Boolean(answer && answer.length > 50));

  const handleCopy = () => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasCharts = (topics && topics.length > 0) || Boolean(kpis);

  return (
    <div className="space-y-4">
      {/* ── View Switcher Tabs ── */}
      {hasCharts && (
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 w-fit">
          <button
            onClick={() => setActiveTab('synthesis')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'synthesis'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Synthesis
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'analytics'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart2 className="w-3 h-3 text-indigo-500" />
            <span>Live Charts</span>
          </button>
        </div>
      )}

      {/* ── Tab 1: Grounded Markdown with Typewriter ── */}
      {activeTab === 'synthesis' && (
        <div className="space-y-3">
          <FormattedMarkdown text={displayedText} isTyping={isTyping} />
        </div>
      )}

      {/* ── Tab 2: Interactive Live Analytics Charts ── */}
      {activeTab === 'analytics' && hasCharts && (
        <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 space-y-4 shadow-2xs">
          {kpis && <KpiGridView kpis={kpis} />}
          {topics.length > 0 && <TopicBarsChart topics={topics} />}
          {kpis && <SentimentDonut kpis={kpis} />}
        </div>
      )}

      {/* ── Action Toolbar ── */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/10 text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
            title="Copy response"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied && <span className="text-emerald-600 text-[10px] font-mono">Copied</span>}
          </button>
          <button
            onClick={() => setFeedback('up')}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${feedback === 'up' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/20' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'}`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setFeedback('down')}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${feedback === 'down' ? 'text-rose-600 bg-rose-50 dark:bg-rose-500/20' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'}`}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>Grounded Database Telemetry</span>
        </div>
      </div>
    </div>
  );
}

export default AgentResponseView;
