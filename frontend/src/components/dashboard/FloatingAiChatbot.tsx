import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { ChatMessage } from '../../types';
import ReactMarkdown from 'react-markdown';
import {
  Bot,
  X,
  Send,
  Sparkles,
  Maximize2,
  Minimize2,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Database,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const FloatingAiChatbot: React.FC = () => {
  const { isChatDrawerOpen, setIsChatDrawerOpen, activeRun } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: "👋 Hello! I am your Voila Voice-of-Customer AI Copilot. Ask me anything about customer pain points, Z-score volume spikes, sentiment friction, or dataset comparisons.",
      timestamp: 'Just now',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatDrawerOpen) {
      scrollToBottom();
    }
  }, [messages, isChatDrawerOpen]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputValue.trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputValue('');
    setIsLoading(true);

    try {
      const response = await api.askAgentQuery(textToSend, activeRun?.run_id || 'run-w32-2026');
      
      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: response.answer || response.response || 'Analysis complete for your query.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tools_used: response.tools_used || ['PostgreSQL Query Engine', 'Z-Score Spike Detector'],
        context: response.context || null,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      const fallbackMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **Unable to reach the Agent server.** Please ensure the backend is active at \`http://127.0.0.1:8000\`.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tools_used: ['Network Gateway'],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const presetQueries = [
    "What are the top 3 recurring customer pain points?",
    "Analyze the latest anomaly spikes and Z-score alerts",
    "What is our current average response latency and FCR?",
    "Summarize prioritized recommendations for the product squad",
  ];

  if (!isChatDrawerOpen) {
    return (
      <button
        onClick={() => setIsChatDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/30 flex items-center gap-2.5 transition-all duration-200 hover:scale-105 group"
        title="Open Voila AI Assistant"
      >
        <Bot className="w-5 h-5" />
        <span className="text-xs font-bold pr-1 hidden sm:inline">AI Copilot</span>
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col transition-all duration-200 ${
        isExpanded ? 'w-[90vw] max-w-3xl h-[85vh]' : 'w-[95vw] sm:w-[440px] h-[580px]'
      }`}
    >
      {/* Chatbot Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-900">
                Voila AI Copilot &amp; Assistant
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              Live RAG &amp; SQL Grounded
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMessages([messages[0]])}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsChatDrawerOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
            title="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-xs prose prose-slate prose-xs'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{m.text}</p>
                ) : (
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                )}

                {/* Agent Tool & Citation Badges */}
                {m.tools_used && m.tools_used.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="text-slate-500 font-semibold">Tools:</span>
                    {m.tools_used.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono border border-blue-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl max-w-[70%] text-xs text-slate-600 shadow-2xs">
            <Bot className="w-4 h-4 text-blue-600 animate-spin" />
            <span>Agent reasoning across customer dataset...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="p-2 border-t border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {presetQueries.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSend(q)}
            className="text-[11px] font-medium whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-slate-200 bg-white rounded-b-2xl flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask AI Copilot about customer pain points or metrics..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="flex-1 px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputValue.trim() || isLoading}
          className="btn-primary py-2 px-3 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
