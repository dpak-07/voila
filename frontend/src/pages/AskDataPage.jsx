import React, { useState, useEffect } from 'react';
import {
  Sparkles, History, ChevronRight, Clock, CheckCircle2,
  MessageSquare, Trash2, Plus, Bot, BarChart2, TrendingUp,
  AlertTriangle, Maximize2, Minimize2, X
} from 'lucide-react';
import { AgentChat } from '../components/agent/AgentChat';
import { agentApi } from '../api/agent';

/* ── Conversation History Sidebar ── */
function ConversationSidebar({ onSelectConversation, activeId }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const data = await agentApi.getConversations(40);
      setConversations(Array.isArray(data) ? data : (data?.conversations || []));
    } catch { setConversations([]); }
    finally { setLoading(false); }
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

  const getStatusIcon = (status) => {
    if (status === 'success') return <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />;
    return <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />;
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
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-display font-bold text-slate-800">History</span>
          {conversations.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono font-bold">
              {conversations.length}
            </span>
          )}
        </div>
        {conversations.length > 0 && (
          <button
            onClick={handleClearAll}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Clear all history"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <MessageSquare className="w-8 h-8 text-slate-300 mb-3" />
            <p className="text-xs text-slate-500 font-mono">No conversations yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">Your chat history will appear here.</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={`group w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                  activeId === conv.id
                    ? 'bg-indigo-50 border border-indigo-200'
                    : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'
                }`}
              >
                <div className="mt-0.5 shrink-0">{getStatusIcon(conv.status)}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate leading-tight ${activeId === conv.id ? 'text-indigo-800' : 'text-slate-800'}`}>
                    {conv.question || 'Untitled query'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate leading-tight">
                    {conv.answer?.slice(0, 60) || '…'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="w-2.5 h-2.5 text-slate-300" />
                    <span className="text-[9px] text-slate-400 font-mono">{formatTime(conv.created_at)}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Refresh */}
      <div className="px-3 pb-3 pt-2 border-t border-slate-100 shrink-0">
        <button
          onClick={load}
          className="w-full py-2 rounded-xl text-xs font-mono font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-dashed border-slate-200 hover:border-indigo-200"
        >
          Refresh History
        </button>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export function AskDataPage() {
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeConvId, setActiveConvId] = useState(null);

  const handleSelectConversation = (item) => {
    setActiveConvId(item.id);
    setSelectedHistoryItem(item);
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col gap-0 overflow-hidden -mx-6 -mt-6 px-6 pt-6">

      {/* ── Page Header (slim) ── */}
      {!isFullScreen && (
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-black text-lg text-slate-900 tracking-tight leading-none">
                Ask the Data
              </h1>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                Agentic intelligence · Live charts · 105,000 interactions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Agent Online
            </div>

            <button
              onClick={() => setIsFullScreen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-mono font-semibold hover:bg-slate-50 transition-all shadow-2xs"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Focus Mode</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className={`flex-1 grid gap-4 overflow-hidden ${isFullScreen ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[1fr_260px]'}`}>

        {/* Chat Panel */}
        <div className="min-h-0 flex flex-col">
          <AgentChat
            selectedHistoryItem={selectedHistoryItem}
            isFullScreen={isFullScreen}
            onToggleFullScreen={() => setIsFullScreen(f => !f)}
          />
        </div>

        {/* History Sidebar (hidden in fullscreen) */}
        {!isFullScreen && (
          <div className="hidden lg:flex flex-col min-h-0">
            <ConversationSidebar
              onSelectConversation={handleSelectConversation}
              activeId={activeConvId}
            />
          </div>
        )}
      </div>

      {/* Bottom padding */}
      <div className="h-4 shrink-0" />
    </div>
  );
}

export default AskDataPage;
