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
  ArrowRight,
  Trash2,
  CornerDownLeft
} from 'lucide-react';
import { agentApi } from '../../api/agent';
import { useRun } from '../../context/RunContext';
import { FormattedMarkdown } from './AgentResponseView';

export function FloatingChatBot() {
  const { activeRunId, activeRun, filters } = useRun();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  const initialMessage = {
    id: 'welcome',
    role: 'assistant',
    text: "Hello! 👋 I'm **Voilà Copilot**, your Voice-of-Customer AI analytics partner.\n\nI have real-time access to the **105,000 customer conversations** and operational metrics in your database.\n\nAsk me anything or tap one of the suggested prompts below:",
    metrics: null,
    recommendations: null,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState([initialMessage]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading]);

  const defaultPrompts = [
    "🚨 What are the top P0 critical issues?",
    "⏱️ Explain our 133.7m response time",
    "📊 What is our Resolution Rate & CSAT?",
    "🌍 How is Latin America performing?",
    "🔍 Analyze 2FA authentication complaints"
  ];

  const handleClearHistory = () => {
    setMessages([initialMessage]);
    setConversationId(null);
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
        run_id: activeRunId || undefined,
        conversation_id: conversationId || undefined,
        company: filters?.company || undefined,
        product: filters?.product || undefined,
        region: filters?.region || undefined,
        time_period: filters?.time_period || undefined,
      });

      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      // Extract rich structured details if returned
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: response.reply || response.answer || response.response || "Here is the operational breakdown from your customer conversations.",
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
          text: "I'm experiencing a temporary connection issue with the analytics engine. Please ensure your backend is active.",
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
          className="relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-900 text-white font-display font-bold text-sm shadow-2xl border border-slate-700 hover:bg-slate-800 transition-all group cursor-pointer"
        >
          <div className="relative w-6 h-6 rounded-lg bg-white p-0.5 shadow-xs flex items-center justify-center">
            <img src="/voila-icon.png" alt="Voilà" className="w-full h-full object-contain" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
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
            className={`flex flex-col bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
              isExpanded
                ? 'w-[92vw] sm:w-[720px] h-[85vh]'
                : 'w-[92vw] sm:w-[480px] h-[620px]'
            }`}
          >
            {/* Header */}
            <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between shadow-xs select-none">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white p-1 shadow-xs flex items-center justify-center shrink-0">
                  <img src="/voila-icon.png" alt="Voilà" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                    <span>Voilà Intelligence Copilot</span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-900 text-indigo-200 text-[10px] font-mono font-bold border border-indigo-700">
                      Live AI
                    </span>
                  </h3>
                  <p className="text-[10px] font-mono text-slate-300">
                    Connected to 105,000 telemetry interactions
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
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
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/60">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white font-medium ml-auto shadow-xs rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200 shadow-xs rounded-tl-xs'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap font-sans text-xs">{msg.text}</p>
                    ) : (
                      <FormattedMarkdown text={msg.text} />
                    )}

                    {/* Rich KPI Chips inside Assistant Message */}
                    {msg.metrics && (
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-mono">
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">Resolution</span>
                          <span className="font-bold text-slate-900">{msg.metrics.resolution_rate || '53.7%'}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">Latency</span>
                          <span className="font-bold text-amber-700">{msg.metrics.avg_response_time || '133.7m'}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">Reopen Rate</span>
                          <span className="font-bold text-rose-600">{msg.metrics.reopen_rate || '44.5%'}</span>
                        </div>
                      </div>
                    )}

                    {/* Citations / Real Evidence */}
                    {Array.isArray(msg.citations) && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-100 space-y-1.5">
                        <span className="text-[10px] font-mono text-slate-500 font-bold block">
                          Grounded Customer Quotes:
                        </span>
                        {msg.citations.slice(0, 2).map((c, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-sans text-slate-700 italic"
                          >
                            "{c.text || c}"
                          </div>
                        ))}
                      </div>
                    )}

                    <span className="block text-[9px] font-mono text-slate-400 mt-2 text-right">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {/* Natural Typing Animation Indicator */}
              {loading && (
                <div className="flex gap-2.5 items-center">
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 ml-1">Analyzing conversation telemetry...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div className="p-2 bg-white border-t border-slate-100 overflow-x-auto flex gap-1.5 scrollbar-none select-none">
              {defaultPrompts.map((p, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleSend(p)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-900 hover:border-indigo-200 text-slate-700 border border-slate-200 text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>{p}</span>
                  <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask Voilà Copilot anything..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white outline-none transition-all"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl bg-slate-900 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FloatingChatBot;
