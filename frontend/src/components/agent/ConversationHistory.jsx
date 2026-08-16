import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, MessageSquare, Clock, ArrowRight, ShieldCheck, AlertCircle, Sparkles, Trash2 } from 'lucide-react';
import { agentApi } from '../../api/agent';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function ConversationHistory({ onSelectConversation, activeConversationId }) {
  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ['agent_conversations'],
    queryFn: () => agentApi.getConversations(30),
    refetchInterval: 15000,
  });

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteOne = async (e, convId) => {
    e.stopPropagation();
    try {
      await agentApi.deleteConversation(convId);
      await refetch();
    } catch (err) {
      console.error('[Delete Conversation Error]:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Clear all query audit history?")) return;
    setIsDeleting(true);
    try {
      await agentApi.clearConversations();
      await refetch();
    } catch (err) {
      console.error('[Clear Conversations Error]:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const list = conversations || [];

  return (
    <div className="p-5 rounded-2xl signal-card space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-zinc-900" />
          <h3 className="font-display font-bold text-sm text-zinc-900">
            Query Audit Log & History
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {list.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isDeleting}
              className="text-[10px] font-mono text-slate-400 hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
              title="Clear all query history"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          )}
          <span className="text-[11px] font-mono text-zinc-500 font-semibold">
            {list.length} past queries
          </span>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={4} height="h-16" />
      ) : list.length === 0 ? (
        <div className="py-8 text-center rounded-xl bg-zinc-50 border border-dashed border-zinc-300 font-mono text-xs text-zinc-500">
          No previous agent queries in database. Ask a question to start.
        </div>
      ) : (
        <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
          {list.map((item) => {
            const isSuccess = item.status === 'success';
            const isInsufficient = item.status === 'insufficient_data';
            const isSelected = activeConversationId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => onSelectConversation && onSelectConversation(item)}
                className={`group p-3 rounded-xl border cursor-pointer transition-all relative ${
                  isSelected
                    ? 'bg-zinc-100 border-zinc-900 shadow-xs'
                    : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100/70'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1">
                  <span>{item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${
                        isSuccess
                          ? 'text-zinc-900 bg-zinc-200'
                          : isInsufficient
                          ? 'text-amber-800 bg-amber-100'
                          : 'text-rose-700 bg-rose-100'
                      }`}
                    >
                      {item.status}
                    </span>
                    <button
                      onClick={(e) => handleDeleteOne(e, item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                      title="Delete record"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-xs font-bold text-zinc-900 transition-colors line-clamp-1">
                  "{item.question}"
                </p>
                {item.answer && (
                  <p className="text-[11px] text-zinc-600 line-clamp-2 mt-1 font-sans">
                    {item.answer.replace(/###|#|\*\*|`/g, '')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ConversationHistory;
