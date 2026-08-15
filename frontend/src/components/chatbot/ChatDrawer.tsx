import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ChatMessage } from '../../types';
import { api } from '../../services/api';
import { ChatMessageItem } from './ChatMessageItem';
import { Bot, X, Send, Loader2, Sparkles, Trash2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ChatDrawer: React.FC = () => {
  const { isChatDrawerOpen, setIsChatDrawerOpen, filters, setActiveTab } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'drawer-1',
      sender: 'assistant',
      text: '🤖 **Voila AI Assistant** is active. Ask quick questions about metrics, anomalies, or recommendations!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatDrawerOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatDrawerOpen, isThinking]);

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const response = await api.queryAgent(input, {
        time_period: filters.timePeriod,
        run_id: filters.runId,
      });

      const botMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.answer || 'Response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tools_used: response.required_tools,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <AnimatePresence>
      {isChatDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsChatDrawerOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Slide-out Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-surface-card/98 backdrop-blur-2xl border-l border-primary-500/30 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-surface-border/60 flex items-center justify-between bg-surface-100/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-primary-600 to-cyan-500 text-white">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Voila AI Quick Copilot
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </h3>
                  <p className="text-[11px] text-slate-400">Contextual query assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setIsChatDrawerOpen(false);
                    setActiveTab('chatbot');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-100 transition"
                  title="Expand to Full Page"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsChatDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => (
                <ChatMessageItem key={m.id} message={m} />
              ))}

              {isThinking && (
                <div className="flex items-center gap-2 text-xs text-cyan-400 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                  <span>Agent reasoning through data...</span>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-surface-border/60 bg-surface-100/40">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask AI Copilot..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isThinking}
                  className="flex-1 bg-surface-200/90 border border-surface-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isThinking}
                  className="btn-gradient-primary py-2.5 px-4 text-xs rounded-xl"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
