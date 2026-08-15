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
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-xl bg-white border-l border-zinc-200 shadow-2xl h-full flex flex-col z-10 text-zinc-900"
          >
            {/* Header */}
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-zinc-900 text-white">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-zinc-900">
                    Live RAG Conversation Evidence
                  </h3>
                  <p className="text-xs font-mono text-zinc-500">
                    Trace Customer Inbound vs. Company Outbound Responses
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-4 border-b border-zinc-200 bg-white">
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search complaint text, e.g. login failure, delayed refund..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 outline-none font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white font-mono text-xs font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Querying...' : 'Search'}
                </button>
              </form>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-zinc-50/50">
              {isLoading ? (
                <div className="space-y-3">
                  <p className="text-xs font-mono text-zinc-600 animate-pulse">
                    Scanning semantic vector index & PostgreSQL embeddings...
                  </p>
                  <LoadingSkeleton rows={4} height="h-24" />
                </div>
              ) : error ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : evidenceData ? (
                <div className="space-y-4">
                  {/* Synthesis / Grounded Answer */}
                  {evidenceData.answer && (
                    <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-zinc-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
                          Synthesized Grounded Answer
                        </span>
                        <ConfidenceBadge confidence="measured" size="sm" />
                      </div>
                      <p className="text-xs text-zinc-700 leading-relaxed font-sans">
                        {evidenceData.answer}
                      </p>
                    </div>
                  )}

                  {/* Retrieved Conversation Exchange Snippets */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-mono font-bold text-zinc-900 uppercase tracking-wider">
                        Conversation Evidence Threads
                      </h4>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {evidenceData.results?.length || 0} retrieved snippets
                      </span>
                    </div>

                    {(evidenceData.results || []).length === 0 ? (
                      <div className="p-6 rounded-xl bg-white border border-dashed border-zinc-300 text-center">
                        <p className="text-xs font-mono text-zinc-600">
                          No exact conversation matches found in active vector index.
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-1">
                          Try searching for keywords like "support", "order", "login", or "refund".
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {evidenceData.results.map((snippet, idx) => {
                          const text = typeof snippet === 'string' ? snippet : (snippet.text || snippet.content || JSON.stringify(snippet));
                          const isInbound = snippet.inbound !== false && snippet.is_company_response !== true;
                          const author = snippet.author_id ? `@${snippet.author_id}` : (isInbound ? 'Customer' : 'Support Agent');
                          const latency = snippet.response_time_minutes ? `${snippet.response_time_minutes}m latency` : null;

                          return (
                            <div
                              key={idx}
                              className={`p-4 rounded-xl border transition-all ${
                                isInbound
                                  ? 'bg-white border-zinc-300 shadow-xs'
                                  : 'bg-zinc-100/90 border-zinc-300 ml-4 shadow-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                                <div className="flex items-center gap-2">
                                  {isInbound ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 text-white font-bold text-[10px] uppercase">
                                      <User className="w-3 h-3" />
                                      Customer (Inbound)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-200 text-zinc-900 border border-zinc-300 font-bold text-[10px] uppercase">
                                      <Bot className="w-3 h-3 text-zinc-700" />
                                      Company Agent (Outbound)
                                    </span>
                                  )}
                                  <span className="text-zinc-600 font-medium">{author}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {latency && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
                                      <Clock className="w-3 h-3" />
                                      {latency}
                                    </span>
                                  )}
                                  {snippet.sentiment && (
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                      snippet.sentiment.toLowerCase() === 'negative'
                                        ? 'bg-rose-100 text-rose-700'
                                        : snippet.sentiment.toLowerCase() === 'positive'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-zinc-200 text-zinc-700'
                                    }`}>
                                      {snippet.sentiment}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs text-zinc-800 font-mono leading-relaxed bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
                                "{text}"
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Database className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-xs font-mono text-zinc-500">
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
