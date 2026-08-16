import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Trash2, Maximize2, Minimize2, User, Clock,
  AlertTriangle, RefreshCw, Zap, Plus, Activity,
  ChevronRight, Sparkles, BarChart2, Target, TrendingUp,
  Mic, StopCircle
} from 'lucide-react';
import { agentApi } from '../../api/agent';
import { AgentResponseView } from './AgentResponseView';
import { useRun } from '../../context/RunContext';

/* ── Preset prompts grouped by intent ── */
const PRESETS = [
  { text: 'What are the top customer pain points?', icon: AlertTriangle, color: 'text-rose-600', bg: 'hover:bg-rose-50 hover:border-rose-200' },
  { text: 'What is the average response time?', icon: Clock, color: 'text-indigo-600', bg: 'hover:bg-indigo-50 hover:border-indigo-200' },
  { text: 'Show me P0 critical issues', icon: Target, color: 'text-amber-600', bg: 'hover:bg-amber-50 hover:border-amber-200' },
  { text: 'Resolution rate vs escalation breakdown', icon: TrendingUp, color: 'text-emerald-600', bg: 'hover:bg-emerald-50 hover:border-emerald-200' },
  { text: 'Sentiment distribution analysis', icon: Activity, color: 'text-violet-600', bg: 'hover:bg-violet-50 hover:border-violet-200' },
  { text: 'Recommend priority interventions', icon: Zap, color: 'text-sky-600', bg: 'hover:bg-sky-50 hover:border-sky-200' },
];

/* ── Typing indicator ── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
        />
      ))}
    </div>
  );
}

export function AgentChat({ selectedHistoryItem, isFullScreen, onToggleFullScreen }) {
  const { activeRunId, filters } = useRun();
  const [question, setQuestion] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      response: {
        question: '',
        answer: "Hello! 👋 I'm **Voilà Copilot**, your Voice-of-Customer AI analytics partner.\n\nI'm connected to your live dataset (**105,000+ conversations**). Ask me anything about:\n- 🚨 **Top Complaint Themes & Root Causes**\n- ⏱️ **Average Response Latency & SLA Trends**\n- 📈 **Resolution Rates, CSAT & Escalations**\n- 💡 **Priority Interventions & Recommendations**\n\nAll answers come with live data charts. How can I help you today?",
        status: 'success',
        context: null
      }
    }
  ]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isQuerying]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [question]);

  // Load from history sidebar
  useEffect(() => {
    if (!selectedHistoryItem) return;
    setMessages(prev => [
      ...prev,
      { id: `hist-user-${Date.now()}`, role: 'user', text: selectedHistoryItem.question },
      {
        id: `hist-asst-${Date.now()}`, role: 'assistant',
        response: {
          question: selectedHistoryItem.question,
          answer: selectedHistoryItem.answer,
          status: selectedHistoryItem.status || 'success',
          query_type: selectedHistoryItem.query_type || 'general',
          context: selectedHistoryItem.context || null,
        }
      }
    ]);
  }, [selectedHistoryItem]);

  const executeQuery = useCallback(async (qText) => {
    const q = (qText || question).trim();
    if (!q || isQuerying) return;

    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', text: q }]);
    setQuestion('');
    setIsQuerying(true);
    setError(null);

    try {
      const res = await agentApi.queryAgent({
        question: q,
        run_id: activeRunId === 'all' ? undefined : activeRunId,
        company: filters.company || undefined,
        product: filters.product || undefined,
        region: filters.region || undefined,
        time_period: filters.time_period || undefined,
      });

      setMessages(prev => [...prev, {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        response: { question: q, ...res }
      }]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Voilà Copilot analysis request failed. Please try again.');
    } finally {
      setIsQuerying(false);
    }
  }, [question, isQuerying, activeRunId, filters]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeQuery();
    }
  };

  const handleNewChat = () => {
    setMessages([{
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      response: {
        question: '',
        answer: 'New conversation started. What would you like to explore about your customer support data?',
        status: 'success',
        context: null
      }
    }]);
    setError(null);
  };

  return (
    <div className={`flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden ${isFullScreen ? 'h-[calc(100vh-120px)]' : 'h-[780px]'}`}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm text-slate-900 tracking-tight">Voilà Intelligence Copilot</h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                Live
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono leading-none mt-0.5">
              {activeRunId && activeRunId !== 'all' ? `Run #${activeRunId.slice(0, 8)} · ` : ''}105,000 interactions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 font-mono text-xs font-semibold border border-slate-200 hover:border-slate-300 transition-all shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>

          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className="p-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 transition-all shadow-2xs"
              title={isFullScreen ? 'Exit Full Screen' : 'Expand'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* ── Message Stream ── */}
      <div ref={containerRef} className="flex-1 overflow-y-auto scroll-smooth">
        <div className="px-4 sm:px-6 py-5 space-y-6">
          {messages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end items-end gap-2.5">
                  <div className="max-w-[78%] rounded-2xl rounded-br-sm px-4 py-3 bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-sm font-sans shadow-sm shadow-indigo-200 leading-relaxed">
                    {msg.text}
                  </div>
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex justify-start items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shrink-0 shadow-xs shadow-indigo-200 mt-0.5">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0 bg-slate-50/60 border border-slate-200/80 rounded-2xl rounded-tl-sm px-5 py-4 shadow-2xs">
                  <AgentResponseView response={msg.response} />
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isQuerying && (
            <div className="flex justify-start items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shrink-0 shadow-xs shadow-indigo-200">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-sm px-5 py-3.5 flex items-center gap-3 shadow-2xs">
                <TypingDots />
                <span className="text-xs font-mono text-slate-500">Analyzing customer telemetry...</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-0.5">Analysis Failed</p>
                <p className="text-rose-600 font-normal">{error}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* ── Preset Chips ── */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 shrink-0">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {PRESETS.map((p, i) => {
            const Icon = p.icon;
            return (
              <button
                key={i}
                onClick={() => executeQuery(p.text)}
                disabled={isQuerying}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-600 whitespace-nowrap transition-all shrink-0 shadow-2xs font-sans disabled:opacity-50 ${p.bg}`}
              >
                <Icon className={`w-3 h-3 ${p.color} shrink-0`} />
                <span>{p.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Input Bar ── */}
      <div className="px-4 pb-4 pt-2 bg-white border-t border-slate-100 shrink-0">
        <div className="flex items-end gap-2.5 p-2 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-50 transition-all shadow-inner">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about response times, root causes, sentiment trends…"
            disabled={isQuerying}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none py-2 px-1 leading-relaxed min-h-[36px] max-h-[140px]"
          />
          <button
            onClick={() => executeQuery()}
            disabled={!question.trim() || isQuerying}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center hover:shadow-md hover:shadow-indigo-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 mb-0.5"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 font-mono mt-2">
          Shift + Enter for new line · Enter to send
        </p>
      </div>
    </div>
  );
}
