import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Trash2, 
  Maximize2, 
  Minimize2, 
  Bot, 
  User, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Zap, 
  AlertCircle,
  HelpCircle,
  Plus
} from 'lucide-react';
import { agentApi } from '../../api/agent';
import { AgentResponseView } from './AgentResponseView';
import { useRun } from '../../context/RunContext';

const PRESET_QUESTIONS = [
  { text: "What is the average response time?", icon: Clock },
  { text: "What are the top customer pain points?", icon: AlertTriangle },
  { text: "Why is our reopen rate at 44.4% and what SLA policy should we enforce?", icon: RefreshCw },
  { text: "Recommend priority operational interventions based on customer tone.", icon: Zap },
];

export function AgentChat({ selectedHistoryItem, isFullScreen, onToggleFullScreen }) {
  const { activeRunId, filters } = useRun();
  const [question, setQuestion] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState(null);

  // Conversational history state for the active session
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      response: {
        question: 'Welcome to Voilà Copilot',
        answer: "Hello! 👋 I am **Voilà Copilot**, your Voice-of-Customer AI analytics partner.\n\nI am connected to your live customer support data (**105,000+ conversations**). You can ask me anything about:\n- 🚨 **Top Complaint Themes & Root Causes**\n- ⏱️ **Average Response Latency & SLA Trends**\n- 📈 **Resolution Rates & CSAT Index**\n- 📋 **Support Policies & Department Action Items**\n\nHow can I help you analyze the dataset today?",
        status: 'success',
        context: null
      }
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isQuerying]);

  // When a history item is selected from the sidebar
  useEffect(() => {
    if (selectedHistoryItem) {
      const userTurn = {
        id: `hist-user-${selectedHistoryItem.id || Date.now()}`,
        role: 'user',
        text: selectedHistoryItem.question
      };
      const assistantTurn = {
        id: `hist-assistant-${selectedHistoryItem.id || Date.now()}`,
        role: 'assistant',
        response: {
          question: selectedHistoryItem.question,
          answer: selectedHistoryItem.answer,
          status: selectedHistoryItem.status || 'success',
          query_type: selectedHistoryItem.query_type || 'general',
          context: selectedHistoryItem.context || null,
        }
      };
      setMessages((prev) => [...prev, userTurn, assistantTurn]);
    }
  }, [selectedHistoryItem]);

  const executeAgentQuery = async (qText) => {
    const q = qText || question;
    if (!q.trim() || isQuerying) return;

    const userMessageId = `user-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        role: 'user',
        text: q.trim()
      }
    ]);

    if (!qText) setQuestion('');
    setIsQuerying(true);
    setError(null);

    try {
      const payload = {
        question: q.trim(),
        run_id: activeRunId === 'all' ? undefined : activeRunId,
        company: filters.company || undefined,
        product: filters.product || undefined,
        region: filters.region || undefined,
        time_period: filters.time_period || undefined,
      };

      const res = await agentApi.queryAgent(payload);

      const assistantTurn = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        response: {
          question: q.trim(),
          ...res,
        }
      };

      setMessages((prev) => [...prev, assistantTurn]);
    } catch (err) {
      console.error('[Agent Query Error]:', err);
      setError(err.response?.data?.detail || 'Voilà Copilot reasoning request failed.');
    } finally {
      setIsQuerying(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    executeAgentQuery(question);
  };

  const handleSelectPreset = (presetText) => {
    setQuestion(presetText);
    executeAgentQuery(presetText);
  };

  const handleNewChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        response: {
          question: 'New Chat',
          answer: "Started a new conversation thread. Ask any question about customer complaints, KPIs, or SLA policies for the active dataset.",
          status: 'success',
          context: null
        }
      }
    ]);
  };

  return (
    <div className={`flex flex-col bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden ${
      isFullScreen ? 'h-[88vh]' : 'h-[720px]'
    }`}>
      {/* Top Header Bar (ChatGPT / Gemini style minimal toolbar) */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-xs">
            <img src="/voila-icon.png" alt="Voilà" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm text-slate-900">
                Voilà Intelligence Copilot
              </h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Telemetry
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              Dataset: <span className="font-semibold text-indigo-600">{activeRunId ? `#${activeRunId.slice(0, 8)}` : '105,000 Ingested Interactions'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleNewChat}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200 shadow-2xs"
            title="Start New Chat"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
          
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 transition-colors border border-slate-200 shadow-2xs"
              title={isFullScreen ? "Exit Full Screen" : "Expand Full Screen"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex justify-end items-start gap-2.5">
                <div className="max-w-[80%] rounded-2xl rounded-tr-xs px-4 py-3 bg-indigo-600 text-white text-sm font-sans font-medium shadow-sm">
                  {msg.text}
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex justify-start items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <img src="/voila-icon.png" alt="Voilà" className="w-full h-full object-contain" />
              </div>
              <div className="max-w-[90%] w-full bg-slate-50/70 border border-slate-200/80 rounded-2xl rounded-tl-xs p-5 shadow-2xs">
                <AgentResponseView response={msg.response} />
              </div>
            </div>
          );
        })}

        {/* Gemini-style Thinking/Reasoning Animation */}
        {isQuerying && (
          <div className="flex justify-start items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs animate-pulse">
              <img src="/voila-icon.png" alt="Voilà" className="w-full h-full object-contain" />
            </div>
            <div className="p-4 rounded-2xl rounded-tl-xs bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
              </div>
              <span className="text-xs font-mono text-slate-600 font-medium">
                Voilà Copilot is analyzing customer conversation telemetry...
              </span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips (Gemini Style) */}
      <div className="px-5 py-2 border-t border-slate-100 bg-slate-50/40">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {PRESET_QUESTIONS.map((q, idx) => {
            const Icon = q.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSelectPreset(q.text)}
                disabled={isQuerying}
                className="px-3 py-1.5 rounded-full bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-xs text-slate-700 hover:text-indigo-700 whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 shadow-2xs font-sans"
              >
                <Icon className="w-3 h-3 text-indigo-600" />
                <span>{q.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modern Capsule Chat Input Bar (Gemini / ChatGPT Style) */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <form onSubmit={handleFormSubmit} className="relative">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask Voilà Copilot about response times, root causes, or SLA policies..."
            disabled={isQuerying}
            className="w-full pl-4 pr-14 py-3.5 rounded-full bg-slate-50 border border-slate-200 text-sm font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!question.trim() || isQuerying}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center hover:shadow-md hover:shadow-indigo-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
