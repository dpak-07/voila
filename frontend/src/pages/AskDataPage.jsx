import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, ChevronRight, Clock, CheckCircle2,
  MessageSquare, Trash2, Plus, Bot, BarChart2, TrendingUp,
  AlertTriangle, Maximize2, Minimize2, X, RefreshCw, Zap,
  Search, ShieldCheck, Database, ArrowRight
} from 'lucide-react';
import { AgentChat } from '../components/agent/AgentChat';
import { agentApi } from '../api/agent';
import { useRun } from '../context/RunContext';

/* ── Conversation History Sidebar ── */
function ConversationSidebar({ onSelectConversation, activeId, onNewChat }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const data = await agentApi.getConversations(30);
      const rawList = Array.isArray(data) ? data : (data?.conversations || []);
      
      // Deduplicate conversations by question text so history stays clean
      const seen = new Set();
      const unique = [];
      for (const item of rawList) {
        const qKey = (item.question || '').trim().toLowerCase();
        if (qKey && !seen.has(qKey)) {
          seen.add(qKey);
          unique.push(item);
        }
      }
      setConversations(unique);
    } catch { 
      setConversations([]); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await agentApi.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
    } catch { }
  };

  const handleClearAll = async () => {
    try {
      await agentApi.clearConversations();
      setConversations([]);
    } catch { }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      const now = new Date();
      const diff = now - d;
      if (diff < 60000) return 'just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/90 dark:border-white/10 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-display font-bold text-slate-800 dark:text-white uppercase tracking-wider">Chat Threads</span>
          {conversations.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold">
              {conversations.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewChat}
            className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Start new conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
          {conversations.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Clear all threads"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">No saved threads yet.</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Queries will appear here automatically.</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv)}
              className={`group w-full text-left px-3 py-2.5 rounded-2xl transition-all flex items-start gap-2.5 cursor-pointer ${
                activeId === conv.id
                  ? 'bg-indigo-50/90 dark:bg-indigo-600/25 border border-indigo-200 dark:border-indigo-500/30 shadow-xs'
                  : 'hover:bg-slate-100/80 dark:hover:bg-white/[0.04] border border-transparent hover:border-slate-200 dark:hover:border-white/10'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate leading-tight ${activeId === conv.id ? 'text-indigo-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                  {conv.question || 'Customer telemetry query'}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate leading-tight">
                  {conv.answer?.slice(0, 45) || '...'}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                  <span className="text-[9px] text-slate-400 font-mono">{formatTime(conv.created_at)}</span>
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(e, conv.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition-all shrink-0 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </button>
          ))
        )}
      </div>

      {/* Footer Refresh */}
      <div className="p-3 border-t border-slate-100 dark:border-white/10 shrink-0 bg-slate-50/50 dark:bg-white/[0.01]">
        <button
          onClick={load}
          className="w-full py-2 rounded-xl text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-white/5 transition-all border border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Sync Chat History</span>
        </button>
      </div>
    </div>
  );
}

/* ── Main Ask Data AI Studio Page ── */
export function AskDataPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalCombinedRecords } = useRun();

  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [initialMessagesFromCopilot, setInitialMessagesFromCopilot] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeConvId, setActiveConvId] = useState(null);

  // Check if routed from floating copilot with existing conversation state
  useEffect(() => {
    if (location.state?.initialMessages) {
      setInitialMessagesFromCopilot(location.state.initialMessages);
      if (location.state.conversationId) {
        setActiveConvId(location.state.conversationId);
      }
    }
  }, [location.state]);

  const handleSelectConversation = (item) => {
    setActiveConvId(item.id);
    setSelectedHistoryItem(item);
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    setSelectedHistoryItem(null);
    setInitialMessagesFromCopilot(null);
  };

  return (
    <div className="h-full w-full flex flex-col gap-2.5 overflow-hidden">
      {/* ── Studio Header Bar ── */}
      {!isFullScreen && (
        <div className="p-3.5 sm:p-4 rounded-3xl glass-card relative overflow-hidden border border-slate-200/90 dark:border-white/10 shadow-lg flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                  Voice-of-Customer AI Analytics Studio
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                  Online
                </span>
              </div>
              <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400 mt-0.5">
                Connected to {totalCombinedRecords?.toLocaleString() || '105,000'} customer conversations · Grounded SQL analytics & vector retrieval
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Thread</span>
            </button>
            <button
              onClick={() => setIsFullScreen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200/80 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              title="Expand to Fullscreen Focus Mode"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Focus Mode</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Main Studio Split Layout (Viewport Constrained) ── */}
      <div className={`flex-1 min-h-0 grid gap-2.5 overflow-hidden ${isFullScreen ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[1fr_300px]'}`}>
        {/* Left: Chat Conversation Feed & Prompt Hub */}
        <div className="h-full flex flex-col min-h-0 overflow-hidden">
          <AgentChat
            selectedHistoryItem={selectedHistoryItem}
            initialMessagesFromCopilot={initialMessagesFromCopilot}
            isFullScreen={isFullScreen}
            onToggleFullScreen={() => setIsFullScreen(f => !f)}
          />
        </div>

        {/* Right: Conversation History Thread Sidebar */}
        {!isFullScreen && (
          <div className="hidden lg:flex flex-col h-full min-h-0 overflow-hidden">
            <ConversationSidebar
              onSelectConversation={handleSelectConversation}
              activeId={activeConvId}
              onNewChat={handleNewChat}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default AskDataPage;
