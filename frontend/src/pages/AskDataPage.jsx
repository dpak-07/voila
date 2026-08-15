import React, { useState } from 'react';
import { Sparkles, MessageSquare, History, Database, Layers, Bot, Maximize2, Minimize2 } from 'lucide-react';
import { AgentChat } from '../components/agent/AgentChat';
import { ConversationHistory } from '../components/agent/ConversationHistory';

export function AskDataPage() {
  const [selectedAuditQuery, setSelectedAuditQuery] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      {!isFullScreen && (
        <div className="p-6 rounded-2xl signal-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-900 text-white shadow-2xs">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-display font-extrabold text-xl text-zinc-900 tracking-tight flex items-center gap-2">
                  <span>Ask the Data — Grounded Agentic Intelligence</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-300 text-xs font-mono font-bold">
                    Interactive Chat
                  </span>
                </h2>
                <p className="text-xs font-mono text-zinc-500 mt-0.5">
                  Natural-language conversational reasoning over customer conversation telemetry, SLAs, and root causes.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsFullScreen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono text-xs transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Screen</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive Grid */}
      <div className={`grid gap-6 transition-all duration-300 ${
        isFullScreen ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'
      }`}>
        <div className={isFullScreen ? 'col-span-1' : 'lg:col-span-2'}>
          <AgentChat
            selectedHistoryItem={selectedAuditQuery}
            isFullScreen={isFullScreen}
            onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
          />
        </div>

        {!isFullScreen && (
          <div>
            <ConversationHistory
              onSelectConversation={(item) => setSelectedAuditQuery(item)}
              activeConversationId={selectedAuditQuery?.id}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default AskDataPage;
