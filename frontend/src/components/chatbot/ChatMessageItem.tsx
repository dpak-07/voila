import React, { useState } from 'react';
import { ChatMessage } from '../../types';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Copy, Check, Wrench, Sparkles } from 'lucide-react';

interface ChatMessageItemProps {
  message: ChatMessage;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const isAssistant = message.sender === 'assistant';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex items-start gap-3 my-3 text-xs md:text-sm animate-in fade-in duration-200 ${
        isAssistant ? 'justify-start' : 'justify-end flex-row-reverse'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
          isAssistant
            ? 'bg-gradient-to-tr from-primary-600 to-cyan-500 text-white'
            : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white'
        }`}
      >
        {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      {/* Message Bubble Container */}
      <div
        className={`max-w-xl md:max-w-2xl rounded-2xl p-4 shadow-lg leading-relaxed relative group ${
          isAssistant
            ? 'bg-surface-100/90 border border-surface-border text-slate-100 rounded-tl-sm'
            : 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-tr-sm'
        }`}
      >
        {/* Agent Tools Badge Strip */}
        {isAssistant && message.tools_used && message.tools_used.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pb-2 mb-2 border-b border-surface-border/50 text-[10px] font-mono text-cyan-300">
            <span className="flex items-center gap-1 text-slate-400">
              <Wrench className="w-3 h-3 text-cyan-400" /> Tools Executed:
            </span>
            {message.tools_used.map((tool, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
              >
                {tool}
              </span>
            ))}
          </div>
        )}

        {/* Message Content */}
        {isAssistant ? (
          <div className="prose prose-invert prose-xs md:prose-sm max-w-none text-slate-200">
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
        ) : (
          <p className="whitespace-pre-wrap font-medium">{message.text}</p>
        )}

        {/* Footer Timestamp & Copy */}
        <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/10 text-[10px] text-slate-400">
          <span>{message.timestamp}</span>
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition p-1 hover:text-white"
            title="Copy Message"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  );
};
