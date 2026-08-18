import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  RefreshCw,
  BarChart2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Minimize2,
  Maximize2,
  ShieldCheck,
  Flame,
  ArrowRight,
  Trash2,
  CornerDownLeft,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { agentApi } from '../../api/agent';
import { useRun } from '../../context/RunContext';
import { FormattedMarkdown } from './AgentResponseView';

export function FloatingChatBot() {
  const navigate = useNavigate();
  const { activeRunId, activeRun, filters, selectedCompany, totalCombinedRecords } = useRun();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  const initialMessage = {
    id: 'welcome',
    role: 'assistant',
    text: `Hello! I'm **Voila Copilot**, your Voice-of-Customer AI analytics partner.\n\nI have real-time access to all **${(totalCombinedRecords || 0).toLocaleString()} customer conversations** and operational metrics in your database.\n\nAsk me anything or tap one of the suggested prompts below:`,
    metrics: null,
    recommendations: null,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState([initialMessage]);
  const messagesEndRef = useRef(null);

  // Keep welcome message record count updated when dataset metadata loads
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [
          {
            ...prev[0],
            text: `Hello! I'm **Voila Copilot**, your Voice-of-Customer AI analytics partner.\n\nI have real-time access to all **${(totalCombinedRecords || 0).toLocaleString()} customer conversations** and operational metrics in your database.\n\nAsk me anything or tap one of the suggested prompts below:`,
          }
        ];
      }
      return prev;
    });
  }, [totalCombinedRecords]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading]);

  const defaultPrompts = [
    "What are the top critical issues?",
    "What is our average response time?",
    "What is our Resolution Rate & CSAT?",
    "Analyze authentication complaints"
  ];

  const handleClearHistory = () => {
    setMessages([initialMessage]);
    setConversationId(null);
  };

  const handleOpenInStudio = () => {
    setIsOpen(false);
    navigate('/dashboard/ask', { 
      state: { 
        initialMessages: messages, 
        conversationId: conversationId 
      } 
    });
  };

  const handleSend = async (userText = null) => {
    const textToSend = userText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!userText) setInput('');
    setLoading(true);

    try {
      const response = await agentApi.chat({
        message: textToSend.trim(),
        run_id: activeRunId === 'all' ? undefined : activeRunId,
        conversation_id: conversationId || undefined,
        company: selectedCompany || filters?.company || undefined,
        product: filters?.product || undefined,
        region: filters?.region || undefined,
        time_period: filters?.time_period || undefined,
      });

      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: response.reply || response.answer || response.response || "Here is the operational breakdown from your customer conversations.",
        metrics: response.kpi_snapshot || response.metrics || null,
        recommendations: response.recommendations || response.action_items || null,
        topics: response.topics || null,
        citations: response.citations || response.evidence || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('[ChatBot Error]:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          text: "I'm experiencing a temporary connection issue with the analytics engine. Please ensure your backend is active.",
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const location = useLocation();

  // Hide floating copilot when user is already on the dedicated /ask Studio page
  if (location.pathname.includes('/ask')) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Trigger Bubble */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-display font-bold text-xs sm:text-sm shadow-2xl border border-slate-700 dark:border-slate-200 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all group cursor-pointer"
        >
          <div className="relative w-6 h-6 rounded-lg bg-indigo-600 text-white p-1 shadow-xs flex items-center justify-center">
            <Bot className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span>Ask Voilà Copilot</span>
        </motion.button>
      )}

      {/* Slide-over Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
              isExpanded
                ? 'w-[94vw] sm:w-[720px] h-[85vh]'
                : 'w-[94vw] sm:w-[480px] h-[600px]'
            }`}
          >
            {/* Header */}
            <div className="px-4 py-3.5 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between shadow-xs select-none border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                    <span>Voilà Copilot</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold border border-emerald-500/30">
                      Live
                    </span>
                  </h3>
                  <p className="text-[10px] font-mono text-slate-300">
                    {(totalCombinedRecords || 0).toLocaleString()} customer conversations
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Expand to Full Studio Button */}
                <button
                  onClick={handleOpenInStudio}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-indigo-200 hover:text-white bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 transition-colors text-[11px] font-mono font-semibold cursor-pointer"
                  title="Open in full Analytics Studio with conversation"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Studio</span>
                </button>

                <button
                  onClick={handleClearHistory}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Reset conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title={isExpanded ? "Collapse view" : "Expand view"}
                >
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close Copilot"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/60 dark:bg-slate-950/50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white font-medium rounded-tr-xs'
                          : msg.isError
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-2xs'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p>{msg.text}</p>
                      ) : (
                        <div className="space-y-3">
                          <FormattedMarkdown text={msg.text} />

                          {/* Live KPI Metric Cards */}
                          {msg.metrics && (
                            <div className="grid grid-cols-3 gap-1.5 pt-1">
                              {msg.metrics.resolution_rate && (
                                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-500/20 text-center">
                                  <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 block uppercase">FCR</span>
                                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{msg.metrics.resolution_rate}</span>
                                </div>
                              )}
                              {msg.metrics.avg_response_time && (
                                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-500/20 text-center">
                                  <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400 block uppercase">Avg SLA</span>
                                  <span className="text-sm font-bold text-amber-700 dark:text-amber-300">{msg.metrics.avg_response_time}</span>
                                </div>
                              )}
                              {msg.metrics.reopen_rate && (
                                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-500/20 text-center">
                                  <span className="text-[9px] font-mono text-rose-600 dark:text-rose-400 block uppercase">Reopen</span>
                                  <span className="text-sm font-bold text-rose-700 dark:text-rose-300">{msg.metrics.reopen_rate}</span>
                                </div>
                              )}
                              {msg.metrics.total_conversations > 0 && (
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-500/20 text-center col-span-3">
                                  <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 block uppercase">Total Conversations</span>
                                  <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{msg.metrics.total_conversations.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Topic Cluster Pills */}
                          {msg.topics && msg.topics.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {msg.topics.slice(0, 5).map((topic, tIdx) => {
                                const name = typeof topic === 'object' ? (topic.cluster_name || topic.topic_keywords || topic.name || `Topic ${tIdx + 1}`) : topic;
                                const vol = typeof topic === 'object' ? (topic.volume || topic.count || 0) : 0;
                                const negPct = typeof topic === 'object' ? (topic.negative_sentiment_percentage ?? null) : null;
                                return (
                                  <span key={tIdx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[10px] font-mono text-slate-700 dark:text-slate-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                    <span className="font-semibold">{name}</span>
                                    {vol > 0 && <span className="text-slate-400">{vol.toLocaleString()}</span>}
                                    {negPct != null && <span className="text-rose-500">{negPct.toFixed(1)}%</span>}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Recommendations */}
                          {msg.recommendations && msg.recommendations.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              {msg.recommendations.slice(0, 3).map((rec, rIdx) => {
                                const action = typeof rec === 'object' ? (rec.action || rec.recommendation || '') : rec;
                                const owner = typeof rec === 'object' ? (rec.owner || '') : '';
                                const impact = typeof rec === 'object' ? (rec.impact || '') : '';
                                if (!action) return null;
                                return (
                                  <div key={rIdx} className="p-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-500/20 text-[10px] text-slate-700 dark:text-slate-300 leading-snug">
                                    {impact && <span className="font-bold text-indigo-700 dark:text-indigo-300">[{impact}] </span>}
                                    {action}
                                    {owner && <span className="text-slate-400 ml-1">({owner})</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Action to expand in Studio if deep analysis */}
                          {messages.length > 1 && msg.id !== 'welcome' && (
                            <button
                              onClick={handleOpenInStudio}
                              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-[11px] font-mono font-bold hover:bg-indigo-100 dark:hover:bg-indigo-600/30 transition-all cursor-pointer shadow-2xs"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Explore Deep Charts in Studio</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 animate-spin">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                    <span>Analyzing dataset telemetry...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Bar */}
            {messages.length <= 2 && (
              <div className="p-2.5 bg-slate-100/70 dark:bg-slate-900 border-t border-slate-200/80 dark:border-white/10 flex gap-1.5 overflow-x-auto no-scrollbar">
                {defaultPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    disabled={loading}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-600/20 text-slate-700 dark:text-slate-300 hover:text-indigo-900 dark:hover:text-white border border-slate-200/80 dark:border-white/10 text-[11px] whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-2xs"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about response times, pain points, P0 issues..."
                className="flex-1 px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500 font-sans"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FloatingChatBot;
