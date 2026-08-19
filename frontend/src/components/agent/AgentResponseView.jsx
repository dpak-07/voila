import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import {
  Check, Copy, ThumbsUp, ThumbsDown,
  TrendingUp, TrendingDown, AlertTriangle, Clock,
  BarChart2, Activity, Target, Users, Zap,
  MessageSquare, Sparkles, ChevronDown, ChevronUp,
  ShieldCheck, Layers, ArrowRight, CornerDownRight, HeartPulse
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
      currentIndex += 4;
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
        if (part.startsWith('`') && part.endsWith('`')) {
          const codeVal = part.slice(1, -1);
          const isGreen = codeVal.includes('🟢') || codeVal.includes('ONLINE') || codeVal.includes('CONNECTED') || codeVal.includes('READY') || codeVal.includes('AUTHENTICATED');
          const isYellow = codeVal.includes('🟡') || codeVal.includes('FALLBACK') || codeVal.includes('NOT_CONFIGURED');
          const isRed = codeVal.includes('🔴') || codeVal.includes('OFFLINE') || codeVal.includes('DISCONNECTED');

          return (
            <code
              key={i}
              className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold border ${
                isGreen
                  ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                  : isYellow
                  ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                  : isRed
                  ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400'
              }`}
            >
              {codeVal}
            </code>
          );
        }
        return part;
      })}
    </>
  );
}

/* ─────────────────────────── Markdown Table Parser ─────────────────────────── */
function MarkdownTable({ lines }) {
  const headers = lines[0].split('|').map(s => s.trim()).filter(Boolean);
  const rows = lines.slice(2).map(line => line.split('|').map(s => s.trim()).filter(Boolean));

  return (
    <div className="overflow-x-auto my-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 shadow-xs">
      <table className="w-full text-left text-xs font-sans">
        <thead className="bg-slate-50 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="py-2.5 px-3.5 font-bold font-mono text-[11px] tracking-wide">
                <InlineFormatter text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="py-2.5 px-3.5 text-slate-800 dark:text-slate-200 leading-relaxed">
                  <InlineFormatter text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FormattedMarkdown({ text = '', isTyping = false }) {
  if (!text) return null;
  const rawLines = text.split('\n');

  // Group markdown table blocks
  const blocks = [];
  let currentTable = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');

    if (isTableRow) {
      currentTable.push(line);
    } else {
      if (currentTable.length > 0) {
        blocks.push({ type: 'table', lines: currentTable });
        currentTable = [];
      }
      blocks.push({ type: 'line', text: line });
    }
  }
  if (currentTable.length > 0) {
    blocks.push({ type: 'table', lines: currentTable });
  }

  return (
    <div className="space-y-2.5 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-sans leading-relaxed">
      {blocks.map((block, idx) => {
        if (block.type === 'table') {
          return <MarkdownTable key={idx} lines={block.lines} />;
        }

        const trimmed = block.text.trim();
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
            {isTyping && idx === blocks.length - 1 && (
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
    { label: 'Avg SLA Latency', value: `${Number(kpis.avg_response_time_minutes || 0).toFixed(1)}m`, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-500/20' },
    { label: 'Resolution Rate', value: `${Number(kpis.resolution_rate || kpis.fcr_rate || 0).toFixed(1)}%`, icon: Target, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/20' },
    { label: 'Escalation Rate', value: `${Number(kpis.escalation_rate || 0).toFixed(1)}%`, icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-500/20' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {metrics.map((m, i) => {
        const Icon = m.icon;
        return (
          <div key={i} className={`p-3 rounded-2xl border ${m.bg} flex flex-col justify-between shadow-2xs`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase">{m.label}</span>
              <Icon className={`w-3.5 h-3.5 ${m.color}`} />
            </div>
            <span className="text-base font-bold font-mono text-slate-900 dark:text-white tracking-tight">{m.value}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── Main Response View Component ─────────────────────────── */
export function AgentResponseView({ response, onPromptClick }) {
  const [activeTab, setActiveTab] = useState('synthesis');
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const answer = response?.answer || '';
  const { displayedText, isTyping } = useTypewriter(answer, 6, true);

  const kpis = response?.context?.analytics?.kpi_metrics || response?.context?.kpis || null;
  const topics = response?.context?.analytics?.topic_clusters || response?.context?.topics || [];

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(answer);
      } else {
        const ta = document.createElement('textarea');
        ta.value = answer;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[Copy failed]:', err);
    }
  };

  const hasCharts = (topics && topics.length > 0) || Boolean(kpis);

  // Dynamic Follow-up Suggestions
  const followUps = useMemo(() => {
    const qLower = (response?.question || '').toLowerCase();
    if (qLower.includes('health') || qLower.includes('snowflake') || qLower.includes('api')) {
      return [
        { label: "What are the top complaint categories?", icon: AlertTriangle },
        { label: "What is our average SLA response time?", icon: Clock },
      ];
    }
    if (qLower.includes('pain') || qLower.includes('complaint') || qLower.includes('topic')) {
      return [
        { label: "Why are customers experiencing these issues?", icon: MessageSquare },
        { label: "Recommend priority operational interventions", icon: Zap },
      ];
    }
    return [
      { label: "What are the top complaint categories?", icon: AlertTriangle },
      { label: "Check system health & API connections", icon: HeartPulse },
    ];
  }, [response?.question]);

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
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-indigo-500" />
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

      {/* ── Action Toolbar & Follow-up Suggestions ── */}
      <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
              title="Copy response"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied && <span className="text-emerald-600 text-[10px] font-mono font-semibold">Copied</span>}
            </button>
            <button
              onClick={() => setFeedback('up')}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${feedback === 'up' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/20' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'}`}
              title="Helpful"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setFeedback('down')}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${feedback === 'down' ? 'text-rose-600 bg-rose-50 dark:bg-rose-500/20' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'}`}
              title="Not helpful"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>Grounded Database & Cloud Telemetry</span>
          </div>
        </div>

        {/* Dynamic Follow-up Action Chips */}
        {onPromptClick && followUps.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <CornerDownRight className="w-3 h-3 text-indigo-500" />
              Follow up:
            </span>
            {followUps.map((f, fIdx) => {
              const Icon = f.icon;
              return (
                <button
                  key={fIdx}
                  onClick={() => onPromptClick(f.label)}
                  className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-white/[0.04] hover:bg-indigo-50 dark:hover:bg-indigo-500/20 text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-white/10 hover:border-indigo-200 transition-all text-[11px] font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Icon className="w-3 h-3 text-indigo-500" />
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentResponseView;
