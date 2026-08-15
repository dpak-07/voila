import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Wrench, 
  Database, 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  HelpCircle, 
  Eye,
  Layers,
  ArrowRight,
  Maximize2,
  Minimize2,
  Trash2,
  Bot,
  User,
  RefreshCw,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { agentApi } from '../../api/agent';
import { QueryPreviewModal } from './QueryPreviewModal';
import { AgentResponseView } from './AgentResponseView';
import { useRun } from '../../context/RunContext';

const PRESET_QUESTIONS = [
  { text: "What is the average response time?", icon: Clock, color: "hover:border-amber-400 hover:bg-amber-50/60 text-amber-900" },
  { text: "What are the top customer pain points?", icon: AlertTriangle, color: "hover:border-rose-400 hover:bg-rose-50/60 text-rose-900" },
  { text: "Why is our reopen rate at 44.4% and what SLA policy should we enforce?", icon: RefreshCw, color: "hover:border-indigo-400 hover:bg-indigo-50/60 text-indigo-900" },
  { text: "Recommend priority operational interventions based on customer tone.", icon: Zap, color: "hover:border-emerald-400 hover:bg-emerald-50/60 text-emerald-900" },
];

export function AgentChat({ selectedHistoryItem, isFullScreen, onToggleFullScreen }) {
  const { activeRunId, filters } = useRun();
  const [question, setQuestion] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState('');

  // Conversational history state for the active session
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      response: {
        question: 'Welcome to Voilà Agentic Intelligence',
        answer: "Hello! I am your **Voice-of-Customer Reasoning & Policy Agent**. Ask me about customer friction topics, average response times, reopen rates, or SLA policy recommendations for the active dataset.",
        status: 'success',
        data_confidence: 'measured',
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
      const historyTurn = {
        id: `hist-${selectedHistoryItem.id || Date.now()}`,
        role: 'assistant',
        response: {
          question: selectedHistoryItem.question,
          answer: selectedHistoryItem.answer,
          status: selectedHistoryItem.status || 'success',
          query_type: selectedHistoryItem.query_type || 'general',
          data_confidence: 'measured',
          context: selectedHistoryItem.context || null,
          citations: selectedHistoryItem.citations || []
        }
      };
      setMessages((prev) => [...prev, historyTurn]);
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
      setError(err.response?.data?.detail || 'Agent service reasoning loop failed.');
    } finally {
      setIsQuerying(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    executeAgentQuery(question);
  };

  const handleOpenPreview = (qText) => {
    setPreviewQuestion(qText || question || PRESET_QUESTIONS[0].text);
    setIsPreviewOpen(true);
  };

  const handleSelectPreset = (presetText) => {
    setQuestion(presetText);
    executeAgentQuery(presetText);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        response: {
          question: 'Welcome to Voilà Agentic Intelligence',
          answer: "Chat thread cleared. Ask any question about customer complaints, KPIs, or SLA policies for the active dataset.",
          status: 'success',
          data_confidence: 'measured',
          context: null
        }
      }
    ]);
  };

  return (
    <div className={`space-y-4 flex flex-col ${isFullScreen ? 'min-h-[85vh]' : 'min-h-[600px]'}`}>
      {/* Top Controls Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <span>Voice-of-Customer Reasoning & Policy Agent</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-mono font-bold text-emerald-800">
                Grounded Telemetry
              </span>
            </h3>
            <p className="text-xs font-mono text-slate-500 font-medium">
              Active Dataset: <strong className="text-indigo-600 font-bold">{activeRunId ? `#${activeRunId.slice(0, 8)}` : 'All Datasets Combined'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200"
            title="Clear Chat Thread"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
              title={isFullScreen ? "Exit Full Screen" : "Expand to Full Screen"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Stream Container */}
      <div className="flex-1 space-y-4 overflow-y-auto max-h-[650px] pr-1">
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-medium text-xs sm:text-sm shadow-md shadow-indigo-100">
                  {msg.text}
                </div>
              </div>
            );
          }
          return (
            <div key={msg.id} className="flex justify-start">
              <div className="max-w-[100%] w-full">
                <AgentResponseView response={msg.response} />
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isQuerying && (
          <div className="p-4 rounded-2xl bg-white border border-indigo-100 shadow-sm flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            <div className="text-xs font-mono text-indigo-900 font-bold">
              Reasoning over live customer conversation telemetry & SQL metrics...
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

      {/* Suggested Quick Question Pills */}
      <div className="flex flex-wrap gap-2 pt-2">
        {PRESET_QUESTIONS.map((q, idx) => {
          const Icon = q.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSelectPreset(q.text)}
              disabled={isQuerying}
              className={`px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-sans font-medium transition-all shadow-2xs flex items-center gap-1.5 ${q.color}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{q.text}</span>
            </button>
          );
        })}
      </div>

      {/* Chat Input Box */}
      <form onSubmit={handleFormSubmit} className="relative mt-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything about response times, customer complaints, or SLA policies..."
          disabled={isQuerying}
          className="w-full pl-4 pr-24 py-3.5 rounded-2xl bg-white border border-slate-300 text-xs sm:text-sm font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 shadow-sm transition-all"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenPreview(question)}
            title="Inspect Agent Reasoning Graph"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={!question.trim() || isQuerying}
            className="px-4 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-mono text-xs font-bold hover:shadow-md hover:shadow-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Query Preview Modal */}
      <QueryPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        question={previewQuestion}
      />
    </div>
  );
}

export default AgentChat;
