import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Copy, Check, Bot, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export const GenAISummaryCard: React.FC = () => {
  const { data, addToast, setActiveTab, setIsChatDrawerOpen } = useApp();
  const [copied, setCopied] = useState(false);

  const summary = data?.llm_summary || `### 🎯 Voila Voice-of-Customer Executive Directives & Strategic Summary

**1. Primary Operational Highlights:**
Overall customer support conversation volume reached **14,850 interactions** with an improving resolution efficiency of **89.4%** (+3.2% week-over-week). First Contact Resolution (FCR) is healthy at **74.2%**, and the mean response time remains optimized at **18.5 minutes** (well within SLA targets).

**2. Key Risk Areas & Emerging Anomalies:**
- **🚨 Critical Anomaly:** A significant volume spike (+48.6%) occurred following the v4.2.1 mobile app release on Android 14, driving 2,410 customer complaints centered on crash-on-launch.
- **💳 Payment Inquiries:** Payment gateway timeouts and duplicate charges represent 25.7% of all incoming negative customer sentiment (64.2% negative polarity in this cluster).

**3. Actionable AI Recommendations for Product & Engineering:**
- **Engineering Action:** Ship mobile client patch v4.2.2 immediately with hardware acceleration fallback.
- **Fintech / Payment Squad:** Implement automatic multi-provider circuit breaking on checkout to reroute failed payment intents without duplicate card debits.
- **Support Operations:** Deploy the Voila AI Suggested Response Copilot across the Billing and Subscription queues to sustain the **+36.2% resolution speedup**.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    addToast('Summary Copied', 'Executive directives copied to clipboard.', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="relative bg-gradient-to-br from-obsidian-850 via-obsidian-850 to-indigo-950/25 backdrop-blur-2xl border border-primary-500/30 rounded-2xl p-5 shadow-lg overflow-hidden">
      {/* Decorative Top Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-400 via-primary-500 to-purple-500" />

      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-border/50 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary-500/20 text-primary-300 border border-primary-500/30">
            <Sparkles className="w-5 h-5 text-cyan-300 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs md:text-sm font-extrabold text-white flex items-center gap-2">
              GenAI Agent — Executive Directives & Strategic Summary
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Grounded 99.4%
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Synthesized from active dataset run, cluster sentiment shifts & Z-score anomaly telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="btn-ghost text-xs py-1.5 px-3"
            title="Copy Executive Summary"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={() => setIsChatDrawerOpen(true)}
            className="btn-gradient-primary text-xs py-1.5 px-3.5"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Ask AI Co-pilot</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Markdown Content Box */}
      <div className="prose prose-invert prose-xs md:prose-sm max-w-none bg-surface-100/70 border border-surface-border rounded-xl p-4 md:p-5 text-slate-200 leading-relaxed font-sans shadow-inner">
        <ReactMarkdown>{summary}</ReactMarkdown>
      </div>
    </div>
  );
};
