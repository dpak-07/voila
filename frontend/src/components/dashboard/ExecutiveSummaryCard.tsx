import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import ReactMarkdown from 'react-markdown';
import { Bot, Copy, Check, Sparkles } from 'lucide-react';

export const ExecutiveSummaryCard: React.FC = () => {
  const { data, addToast, setIsChatDrawerOpen } = useApp();
  const [copied, setCopied] = useState(false);

  const summary = data?.llm_summary || null;

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    addToast('Summary Copied', 'Executive voice-of-customer directives copied to clipboard.', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="relative bg-white border-2 border-blue-500 rounded-xl p-5 shadow-sm shadow-blue-500/10 transition-all">
      {/* Top Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-bold text-slate-900">
                Executive Voice-of-Customer Signal &amp; Strategic Directives
              </h2>
              <span className="badge-blue text-[10px]">
                GenAI Synthesis
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated LLM narrative synthesizing customer conversation streams, friction anomalies &amp; operational priorities
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="btn-secondary py-1.5 px-3 text-xs"
            title="Copy Executive Summary"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={() => setIsChatDrawerOpen(true)}
            className="btn-primary py-1.5 px-3.5 text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask AI Copilot</span>
          </button>
        </div>
      </div>

      {/* Markdown Content Box */}
      <div className="prose prose-slate prose-sm max-w-none bg-slate-50 border border-slate-200 rounded-lg p-4 md:p-5 text-slate-700 leading-relaxed font-sans shadow-inner">
        {summary ? (
          <ReactMarkdown>{summary}</ReactMarkdown>
        ) : (
          <p className="text-slate-400 text-xs text-center py-6">
            No executive summary available yet. Upload a dataset to generate a grounded executive brief.
          </p>
        )}
      </div>
    </div>
  );
};
