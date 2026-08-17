import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Trash2, Maximize2, Minimize2, User, Clock,
  AlertTriangle, RefreshCw, Zap, Plus, Activity,
  ChevronRight, BarChart2, Target, TrendingUp,
  Bot, CornerDownLeft, ShieldCheck, Sparkles, MessageSquare
} from 'lucide-react';
import { agentApi } from '../../api/agent';
import { AgentResponseView } from './AgentResponseView';
import { useRun } from '../../context/RunContext';

/* ── Categorized Quick Prompts ── */
const PROMPT_CATEGORIES = [
  {
    title: "Critical Issues & Friction",
    prompts: [
      { text: "What are the top P0 critical pain points?", icon: AlertTriangle, color: "text-rose-600 dark:text-rose-400" },
      { text: "Analyze application malfunction & crash trends", icon: Target, color: "text-amber-600 dark:text-amber-400" },
    ]
  },
  {
    title: "SLA & Operations",
    prompts: [
      { text: "What is the average response time latency?", icon: Clock, color: "text-indigo-600 dark:text-indigo-400" },
      { text: "Resolution rate vs escalation breakdown", icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400" },
    ]
  },
  {
    title: "Root Cause & Strategy",
    prompts: [
      { text: "Recommend priority operational interventions", icon: Zap, color: "text-sky-600 dark:text-sky-400" },
      { text: "Why are customers unhappy with customer support?", icon: MessageSquare, color: "text-violet-600 dark:text-violet-400" },
    ]
  }
];

export function AgentChat({ 
  selectedHistoryItem, 
  initialMessagesFromCopilot, 
  isFullScreen, 
  onToggleFullScreen 
}) {
  const { activeRunId, filters, selectedCompany, totalCombinedRecords } = useRun();
  const [question, setQuestion] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  const initialWelcome = {
    id: 'welcome',
    role: 'assistant',
    response: {
      question: '',
      answer: `Hello! I'm **Voilà Copilot**, your Voice-of-Customer AI analytics partner.\n\nI have direct access to all **${(totalCombinedRecords || 0).toLocaleString()} customer conversations** in your active dataset.\n\nSelect one of the analytical focus areas below or ask any custom operational query to get grounded SQL analytics and root-cause evidence:`,
      status: 'success',
      context: null
    }
  };

  const [messages, setMessages] = useState([initialWelcome]);

  // Load state from floating copilot handoff if available
  useEffect(() => {
    if (initialMessagesFromCopilot && initialMessagesFromCopilot.length > 0) {
      const formatted = initialMessagesFromCopilot.map((m, idx) => {
        if (m.role === 'user') {
          return { id: `copilot-u-${idx}`, role: 'user', text: m.text };
        } else {
          return {
            id: `copilot-a-${idx}`,
            role: 'assistant',
            response: {
              question: '',
              answer: m.text,
              status: 'success',
              context: m.metrics ? { kpis: m.metrics } : null
            }
          };
        }
      });
      setMessages(formatted);
    }
  }, [initialMessagesFromCopilot]);

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
    if (selectedHistoryItem) {
      setMessages(prev => [
        ...prev,
        { id: `hist-u-${selectedHistoryItem.id}`, role: 'user', text: selectedHistoryItem.question },
        {
          id: `hist-a-${selectedHistoryItem.id}`,
          role: 'assistant',
          response: {
            question: selectedHistoryItem.question,
            answer: selectedHistoryItem.answer,
            status: selectedHistoryItem.status || 'success',
            query_type: selectedHistoryItem.query_type,
            required_tools: selectedHistoryItem.tools || [],
            context: null
          }
        }
      ]);
    }
  }, [selectedHistoryItem]);

  const executeQuery = useCallback(async (qText = null) => {
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
        company: selectedCompany || filters?.company || undefined,
        product: filters?.product || undefined,
        region: filters?.region || undefined,
        time_period: filters?.time_period || undefined,
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
  }, [question, isQuerying, activeRunId, filters, selectedCompany]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeQuery();
    }
  };

  const handleNewChat = () => {
    setMessages([initialWelcome]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full glass-card rounded-3xl overflow-hidden border border-slate-200/90 dark:border-white/10 shadow-lg">
      {/* ── Chat Header ── */}
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Conversational Telemetry
            </h3>
            <p className="text-[10px] font-mono text-slate-400">
              Live SQL Reasoner & Citation Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleNewChat}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Clear Chat Stream"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleFullScreen}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title={isFullScreen ? "Collapse View" : "Expand Focus View"}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Message Stream Feed ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/40 dark:bg-slate-950/40">
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
            {msg.role === 'user' ? (
              /* User Query Bubble */
              <div className="flex justify-end items-start gap-3 pl-8">
                <div className="p-4 rounded-3xl bg-indigo-600 text-white shadow-md max-w-2xl text-xs sm:text-sm font-medium leading-relaxed">
                  {msg.text}
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 font-mono text-xs font-bold shadow-xs">
                  <User className="w-4 h-4" />
                </div>
              </div>
            ) : (
              /* Assistant AI Response Node */
              <div className="flex items-start gap-3 pr-4 sm:pr-8">
                <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/25 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xs space-y-4">
                    <AgentResponseView
                      response={msg.response}
                      onPromptClick={(p) => executeQuery(p)}
                    />

                    {/* Quick Prompts Hub in Welcome message */}
                    {msg.id === 'welcome' && (
                      <div className="pt-3 border-t border-slate-100 dark:border-white/10 space-y-3">
                        <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          Suggested Analytical Focus Areas
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {PROMPT_CATEGORIES.map((cat, cIdx) => (
                            <div key={cIdx} className="space-y-1.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-white/5">
                              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block px-1">
                                {cat.title}
                              </span>
                              {cat.prompts.map((p, pIdx) => {
                                const Icon = p.icon;
                                return (
                                  <button
                                    key={pIdx}
                                    onClick={() => executeQuery(p.text)}
                                    className="w-full text-left p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-600/20 text-slate-700 dark:text-slate-300 hover:text-indigo-900 dark:hover:text-white border border-slate-200/80 dark:border-white/10 hover:border-indigo-200 transition-all text-xs flex items-start gap-1.5 cursor-pointer group shadow-2xs"
                                  >
                                    <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${p.color}`} />
                                    <span className="leading-tight">{p.text}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Querying Indicator */}
        {isQuerying && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/25 mt-1 animate-spin">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xs flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                Reasoning across {totalCombinedRecords?.toLocaleString() || '...'} interactions & executing SQL telemetry queries...
              </span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Bar ── */}
      <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeQuery();
          }}
          className="relative flex items-end gap-2 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-white/10 p-2 focus-within:border-indigo-500 transition-colors shadow-2xs"
        >
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about response times, customer pain points, SLA trends, P0 issues..."
            className="flex-1 bg-transparent border-0 outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 resize-none py-1.5 px-2 max-h-36 font-sans leading-relaxed"
          />

          <button
            type="submit"
            disabled={!question.trim() || isQuerying}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors cursor-pointer shrink-0 shadow-xs"
            title="Send Query"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-2 px-1">
          <span>Press <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-white/10 rounded">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-white/10 rounded">Shift + Enter</kbd> for new line</span>
          <span>100% Grounded Telemetry</span>
        </div>
      </div>
    </div>
  );
}

export default AgentChat;
