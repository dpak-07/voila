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
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Question:</span>
          <p className="text-sm font-bold text-slate-900 mt-0.5">"{question}"</p>
        </div>

        {isLoading ? (
          <LoadingSkeleton rows={3} height="h-16" />
        ) : error ? (
          <p className="text-rose-600 font-mono">{error}</p>
        ) : preview ? (
          <div className="space-y-4">
            {/* Query classification */}
            <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 font-mono">
              <span className="text-[10px] text-indigo-700 uppercase font-bold">Classified Query Type</span>
              <p className="text-sm font-bold text-indigo-900 mt-0.5 capitalize">
                {preview.query_type ? preview.query_type.replace(/_/g, ' ') : 'General Analysis'}
              </p>
            </div>

            {/* Selected Tool Pipeline */}
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-2 font-semibold">
                Selected Tools & Action Pipeline
              </span>
              <div className="space-y-2">
                {(preview.required_tools || []).map((tool, idx) => {
                  const actions = preview.required_actions?.[tool] || [];
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 shrink-0">
                        <Wrench className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-slate-900 capitalize">
                          {tool} Tool
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {actions.map((act, actIdx) => (
                            <span
                              key={actIdx}
                              className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-700 font-medium"
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
            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onClose();
                  if (onExecute) onExecute(question);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold text-xs shadow-xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
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
