import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Play, Wrench } from 'lucide-react';
import { Modal } from '../common/Modal';
import { agentApi } from '../../api/agent';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function QueryPreviewModal({ isOpen, onClose, question, onExecute }) {
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && question) {
      fetchPreview();
    }
  }, [isOpen, question]);

  const fetchPreview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await agentApi.previewDecision({ question });
      setPreview(data);
    } catch (err) {
      console.error('[Preview decision error]:', err);
      setError('Unable to preview tool routing decision.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agentic Decision Route Preview" maxWidth="max-w-xl">
      <div className="space-y-4 font-sans text-xs">
        {/* Question banner */}
        <div className="p-3.5 rounded-xl bg-void-950 border border-slate-800 font-mono">
          <span className="text-[10px] text-slate-400 uppercase">Question:</span>
          <p className="text-sm font-bold text-slate-100 mt-0.5">"{question}"</p>
        </div>

        {isLoading ? (
          <LoadingSkeleton rows={3} height="h-16" />
        ) : error ? (
          <p className="text-signal-crimson font-mono">{error}</p>
        ) : preview ? (
          <div className="space-y-4">
            {/* Query classification */}
            <div className="p-3.5 rounded-xl bg-void-950/80 border border-slate-800 font-mono">
              <span className="text-[10px] text-slate-400 uppercase">Classified Query Type</span>
              <p className="text-sm font-bold text-signal-emerald mt-0.5 capitalize">
                {preview.query_type ? preview.query_type.replace(/_/g, ' ') : 'General Analysis'}
              </p>
            </div>

            {/* Selected Tool Pipeline */}
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                Selected Tools & Action Pipeline
              </span>
              <div className="space-y-2">
                {(preview.required_tools || []).map((tool, idx) => {
                  const actions = preview.required_actions?.[tool] || [];
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-void-950 border border-slate-800 flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-signal-cyan/10 border border-signal-cyan/30 shrink-0">
                        <Wrench className="w-4 h-4 text-signal-cyan" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-slate-200 capitalize">
                          {tool} Tool
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {actions.map((act, actIdx) => (
                            <span
                              key={actIdx}
                              className="px-2 py-0.5 rounded bg-void-900 border border-slate-700 text-[10px] font-mono text-slate-300"
                            >
                              {act}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Execute Button */}
            <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-void-800 text-slate-300 hover:bg-void-700 text-xs font-mono"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onClose();
                  if (onExecute) onExecute(question);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-signal-emerald text-void-950 font-mono font-bold hover:bg-signal-glow text-xs"
              >
                <Play className="w-3.5 h-3.5 fill-void-950" />
                <span>Execute Agent Query</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export default QueryPreviewModal;
