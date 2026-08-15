import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ChatMessage } from '../../types';
import { api } from '../../services/api';
import { ChatMessageItem } from './ChatMessageItem';
import {
  Send,
  Sparkles,
  Bot,
  Trash2,
  HelpCircle,
  TrendingUp,
  CreditCard,
  Smartphone,
  RotateCcw,
  Loader2,
} from 'lucide-react';

export const ChatPage: React.FC = () => {
  const { filters, addToast } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: `👋 **Hello! I am Voila AI Copilot**, your Voice-of-Customer Intelligence and Analytical Reasoning Agent.\n\nAsk me anything regarding:\n- 💳 Payment and double-charge anomalies\n- 📱 Mobile app crash spikes on Android 14\n- 📈 Resolution & escalation KPI trends\n- 🎯 Root cause analysis & strategic mitigation directives`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tools_used: ['agentic_reasoning_hub', 'schema_validator'],
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const promptSuggestions = [
    { text: 'Top 3 billing & payment complaints', icon: <CreditCard className="w-3.5 h-3.5 text-rose-400" /> },
    { text: 'Analyze Android 14 crash anomaly spike', icon: <Smartphone className="w-3.5 h-3.5 text-amber-400" /> },
    { text: 'Overview of operational KPIs & SLA compliance', icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> },
    { text: 'Recommendations for reducing recurring issues', icon: <RotateCcw className="w-3.5 h-3.5 text-cyan-400" /> },
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const response = await api.queryAgent(textToSend, {
        time_period: filters.timePeriod,
        run_id: filters.runId,
      });

      const botMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.answer || 'Analysis complete.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tools_used: response.required_tools || ['kpi_tool', 'cluster_tool'],
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      addToast('Query Error', 'Failed to receive agent response.', 'error');
    } finally {
      setIsThinking(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: 'init-1',
        sender: 'assistant',
        text: 'Chat history cleared. How can I assist you with your customer support analytics today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="pbi-card flex flex-col h-[calc(100vh-140px)] max-h-[850px] p-0 overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-surface-border/60 bg-surface-100/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 via-indigo-500 to-cyan-400 p-[1.5px]">
            <div className="w-full h-full bg-surface-card rounded-[10px] flex items-center justify-center">
              <Bot className="w-5 h-5 text-cyan-300" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Voila Agentic AI Reasoning Assistant
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Online • Multi-Tool
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Grounded database context, cluster reasoning & real-time metric queries
            </p>
          </div>
        </div>

        <button
          onClick={handleClear}
          className="btn-ghost text-xs py-1.5 px-3"
          title="Clear Conversation"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.map((m) => (
          <ChatMessageItem key={m.id} message={m} />
        ))}

        {isThinking && (
          <div className="flex items-center gap-3 text-xs text-cyan-400 my-3 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-primary-600/30 border border-primary-500/30 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
            </div>
            <div className="p-3 rounded-xl bg-surface-100/80 border border-surface-border/80 text-slate-300">
              Agent is querying PostgreSQL tables & running reasoning tools...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-4 py-2 bg-surface-200/50 border-t border-surface-border/40 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider shrink-0">
          Suggested:
        </span>
        {promptSuggestions.map((sug, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(sug.text)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-100 hover:bg-surface-50 border border-surface-border text-xs text-slate-300 hover:text-white transition shrink-0"
          >
            {sug.icon}
            <span>{sug.text}</span>
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <div className="p-4 border-t border-surface-border/60 bg-surface-100/30">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            placeholder="Ask anything (e.g., 'What caused the spike on Wednesday?', 'Compare Week 31 vs Week 32')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isThinking}
            className="flex-1 bg-surface-200/90 border border-surface-border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className="btn-gradient-primary py-3 px-5 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send Query</span>
          </button>
        </form>
      </div>
    </div>
  );
};
