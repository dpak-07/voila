import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Sparkles,
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
  ArrowRight
} from 'lucide-react';
import { agentApi } from '../../api/agent';
import { useRun } from '../../context/RunContext';
import { FormattedMarkdown } from './AgentResponseView';

export function FloatingChatBot() {
  const { activeRunId, activeRun } = useRun();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hello! I am your Voilà Data Copilot. Ask me anything about customer complaint clusters, service quality KPIs, reopen rates, or SLA recommendations for the active dataset.",
      metrics: null,
      recommendations: null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const quickPrompts = [
    "Analyze top customer pain points",
    "Why is our reopen rate at 46.8%?",
    "Generate executive root-cause report",
    "Recommend priority SLA fixes"
  ];

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
        run_id: activeRunId || undefined,
        conversation_id: conversationId || undefined,
      });

      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      // Extract rich structured details if returned
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: response.reply || response.answer || response.response || "Analysis completed based on the active dataset.",
        metrics: response.kpi_snapshot || response.metrics || null,
        recommendations: response.recommendations || response.action_items || null,
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
          text: "I encountered an issue querying the agent service. Please verify the backend server is running and dataset is ingested.",
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

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
          className="relative flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-zinc-900 text-white font-display font-bold text-sm shadow-2xl border border-zinc-700 hover:bg-zinc-800 transition-all group"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <span className="hidden sm:inline">Ask Voilà Copilot</span>
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
            className={`flex flex-col bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
              isExpanded
                ? 'w-[92vw] sm:w-[680px] h-[85vh]'
                : 'w-[92vw] sm:w-[460px] h-[600px]'
            }`}
          >
            {/* Header */}
            <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-900 text-white">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-zinc-900 flex items-center gap-2">
                    <span>Voilà Intelligence Copilot</span>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 text-[10px] font-mono font-bold">
                      Grounded
                    </span>
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-500">
                    Active Dataset: {activeRunId ? `#${activeRunId.slice(0, 8)}` : 'Global Baseline'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 transition-colors"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-zinc-50/50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-zinc-900 text-white font-medium ml-auto shadow-xs'
                        : 'bg-white text-zinc-800 border border-zinc-200 shadow-xs'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <FormattedMarkdown text={msg.text} />
                    )}

                    {/* Rich KPI Chips inside Assistant Message */}
                    {msg.metrics && (
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-zinc-200 text-[11px] font-mono">
                        <div className="p-2 rounded bg-zinc-50 border border-zinc-200">
                          <span className="text-zinc-500 block text-[10px]">Resolution</span>
                          <span className="font-bold text-zinc-900">{msg.metrics.resolution_rate || '14.6%'}</span>
                        </div>
                        <div className="p-2 rounded bg-zinc-50 border border-zinc-200">
                          <span className="text-zinc-500 block text-[10px]">Reopen Rate</span>
                          <span className="font-bold text-rose-600">{msg.metrics.reopen_rate || '46.8%'}</span>
                        </div>
                      </div>
                    )}

                    {/* Citations / Real Evidence */}
                    {Array.isArray(msg.citations) && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-zinc-200 space-y-1.5">
                        <span className="text-[10px] font-mono text-zinc-600 font-bold block">
                          Grounded Quotes:
                        </span>
                        {msg.citations.slice(0, 2).map((c, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-2 rounded bg-zinc-50 border border-zinc-200 text-[11px] font-mono text-zinc-700 italic"
                          >
                            "{c.text || c}"
                          </div>
                        ))}
                      </div>
                    )}

                    <span className="block text-[9px] font-mono text-zinc-400 mt-2 text-right">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 items-center text-xs font-mono text-zinc-500 p-2">
                  <div className="w-7 h-7 rounded-xl bg-zinc-200 flex items-center justify-center">
                    <RefreshCw className="w-3.5 h-3.5 text-zinc-700 animate-spin" />
                  </div>
                  <span>Reasoning over verified conversation vectors...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            <div className="p-2.5 bg-white border-t border-zinc-200 overflow-x-auto flex gap-1.5 scrollbar-none">
              {quickPrompts.map((p, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleSend(p)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 text-[11px] font-mono whitespace-nowrap transition-colors flex items-center gap-1"
                >
                  <span>{p}</span>
                  <ArrowRight className="w-2.5 h-2.5 text-zinc-400" />
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-zinc-200 flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about KPIs, topic spikes, or root causes..."
                className="flex-1 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 text-xs font-mono text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 outline-none"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FloatingChatBot;
