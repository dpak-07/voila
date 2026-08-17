import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Database, MessageSquare, ShieldCheck, Sparkles, AlertCircle, User, Bot, Clock } from 'lucide-react';
import { ragApi } from '../../api/rag';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { ConfidenceBadge } from '../common/ConfidenceBadge';

export function RagEvidenceDrawer({ isOpen, onClose, topicQuery, topicName }) {
  const [query, setQuery] = useState(topicQuery || topicName || '');
  const [evidenceData, setEvidenceData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const targetQ = topicQuery || topicName;
    if (targetQ && isOpen) {
      setQuery(targetQ);
      fetchEvidence(targetQ);
    }
  }, [topicQuery, topicName, isOpen]);

  const fetchEvidence = async (searchQuery) => {
    if (!searchQuery) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await ragApi.queryRag(searchQuery);
      setEvidenceData(res);
    } catch (err) {
      console.error('[RAG Search Error]:', err);
      setError('Unable to fetch live RAG evidence from the vector database.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEvidence(query);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 shadow-2xl h-full flex flex-col z-10 text-slate-900 dark:text-white"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                    Live RAG Conversation Evidence
                  </h3>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Trace Customer Inbound vs. Company Outbound Responses
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search complaint text, e.g. login failure, delayed refund..."
                    className="w-full pl-9 pr-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 outline-none font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-2xl bg-indigo-600 text-white font-mono text-xs font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isLoading ? 'Querying...' : 'Search'}
                </button>
              </form>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
              {isLoading ? (
                <div className="space-y-3">
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-400 animate-pulse">
                    Scanning semantic vector index & PostgreSQL embeddings...
                  </p>
                  <LoadingSkeleton rows={4} height="h-24" />
                </div>
              ) : error ? (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : evidenceData ? (
                <div className="space-y-4">
                  {/* Informational Sampling Note */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-500/20 text-xs font-mono text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5 shadow-2xs">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold block">Representative Ingested Evidence Sample</span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                        Displaying top semantic interaction threads matching your query. Complete raw dataset interactions can be explored across dashboard views or exported via CSV.
                      </p>
                    </div>
                  </div>

                  {/* Synthesis / Grounded Answer */}
                  {evidenceData.answer && (
                    <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          Synthesized Grounded Answer
                        </span>
                        <ConfidenceBadge confidence="measured" size="sm" />
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                        {evidenceData.answer}
                      </p>
                    </div>
                  )}

                  {/* Retrieved Conversation Exchange Snippets */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Conversation Threads & Dialogues
                      </h4>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {evidenceData.results?.length || 0} retrieved threads
                      </span>
                    </div>

                    {(evidenceData.results || []).length === 0 ? (
                      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-white/15 text-center">
                        <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                          No exact conversation matches found in active vector index.
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Try searching for keywords like "support", "order", "login", or "refund".
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {evidenceData.results.map((snippet, idx) => {
                          const customerText = typeof snippet === 'string' ? snippet : (snippet.text || snippet.clean_text || snippet.content || '');
                          const isInbound = snippet.inbound !== false && snippet.is_company_response !== true;
                          const customerAuthor = snippet.author_id ? `@${snippet.author_id}` : 'Customer';
                          const agentText = snippet.agent_response_text;
                          const agentAuthor = snippet.agent_author_id ? `@${snippet.agent_author_id}` : (snippet.company || 'Support Agent');
                          const latency = snippet.response_time_minutes ? `${Number(snippet.response_time_minutes).toFixed(1)}m SLA` : null;

                          return (
                            <div
                              key={idx}
                              className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xs space-y-3"
                            >
                              {/* 1. Customer Inbound Query */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-[10px]">
                                      <User className="w-3 h-3" />
                                      Inbound Customer
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400 text-xs">{customerAuthor}</span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {latency && (
                                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                        <Clock className="w-3 h-3" />
                                        {latency}
                                      </span>
                                    )}
                                    {snippet.sentiment && (
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                                        snippet.sentiment.toLowerCase() === 'negative'
                                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                          : snippet.sentiment.toLowerCase() === 'positive'
                                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                      }`}>
                                        {snippet.sentiment}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <p className="text-xs text-slate-800 dark:text-slate-200 font-sans leading-relaxed bg-slate-50/80 dark:bg-slate-950/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                  "{customerText}"
                                </p>
                              </div>

                              {/* 2. Paired Company Support Response (if present) */}
                              {agentText && (
                                <div className="space-y-1.5 pl-3 border-l-2 border-indigo-500/40 ml-2 mt-2">
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold text-[10px]">
                                      <Bot className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                      Support Outbound
                                    </span>
                                    <span className="text-indigo-600 dark:text-indigo-400 font-medium text-xs">{agentAuthor}</span>
                                  </div>
                                  <p className="text-xs text-slate-800 dark:text-slate-200 font-sans leading-relaxed bg-indigo-50/40 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                                    "{agentText}"
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Database className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Click any complaint topic or search above to inspect grounded customer evidence.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default RagEvidenceDrawer;
