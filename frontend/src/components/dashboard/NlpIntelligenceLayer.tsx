import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Layers,
  Cpu,
  Boxes,
  Wifi,
  Headphones,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const NlpIntelligenceLayer: React.FC = () => {
  const { data, setIsChatDrawerOpen } = useApp();
  const [selectedSquad, setSelectedSquad] = useState<'all' | 'product' | 'network' | 'support'>('all');

  const recommendations = data?.recommendations || data?.root_cause_analysis || [];
  const topicSummaries = data?.topic_summaries || [];

  // Group recommendations dynamically into Product, Network, and Support squads
  const enrichedRecommendations = recommendations.map((rec, idx) => {
    const topic = (rec.topic || rec.issue || '').toLowerCase();
    const owner = (rec.owner || '').toLowerCase();

    let squad: 'Product' | 'Network' | 'Support' = 'Support';
    if (owner.includes('product') || topic.includes('app') || topic.includes('ui') || topic.includes('crash') || topic.includes('billing') || topic.includes('login') || topic.includes('payment')) {
      squad = 'Product';
    } else if (owner.includes('network') || owner.includes('infra') || topic.includes('network') || topic.includes('outage') || topic.includes('speed') || topic.includes('coverage') || topic.includes('disconnect') || topic.includes('latency')) {
      squad = 'Network';
    } else {
      squad = 'Support';
    }

    return {
      ...rec,
      squad,
      rank: idx + 1,
      priorityLabel: idx === 0 ? 'P0 Critical' : idx < 3 ? 'P1 High' : 'P2 Operational',
    };
  });

  const filteredRecs = selectedSquad === 'all'
    ? enrichedRecommendations
    : enrichedRecommendations.filter((r) => r.squad.toLowerCase() === selectedSquad);

  return (
    <div className="space-y-4">
      {/* Header & Squad Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Prioritized Actionable Recommendations by Squad</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Grounded LLM action directives categorized for Product, Network, and Support engineering teams
          </p>
        </div>

        {/* Squad Slicers */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setSelectedSquad('all')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition ${
              selectedSquad === 'all'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Squads ({enrichedRecommendations.length})
          </button>
          <button
            onClick={() => setSelectedSquad('product')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition flex items-center gap-1 ${
              selectedSquad === 'product'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-blue-600" />
            <span>Product</span>
          </button>
          <button
            onClick={() => setSelectedSquad('network')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition flex items-center gap-1 ${
              selectedSquad === 'network'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span>Network</span>
          </button>
          <button
            onClick={() => setSelectedSquad('support')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition flex items-center gap-1 ${
              selectedSquad === 'support'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Headphones className="w-3.5 h-3.5 text-indigo-600" />
            <span>Support</span>
          </button>
        </div>
      </div>

      {/* Grid of Squad Recommendations */}
      {filteredRecs.length === 0 ? (
        <div className="analytics-card text-center py-8 text-slate-400">
          <p className="text-xs font-semibold">No recommendations found for this squad filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecs.map((rec, idx) => {
            const isProduct = rec.squad === 'Product';
            const isNetwork = rec.squad === 'Network';
            const isCritical = rec.priorityLabel.includes('P0');

            return (
              <div
                key={rec.id || idx}
                className={`analytics-card flex flex-col justify-between space-y-3 border-t-4 ${
                  isProduct
                    ? 'border-t-blue-500 hover:border-blue-300'
                    : isNetwork
                    ? 'border-t-emerald-500 hover:border-emerald-300'
                    : 'border-t-indigo-500 hover:border-indigo-300'
                } transition shadow-sm`}
              >
                <div className="space-y-2.5">
                  {/* Top Bar: Squad Badge & Priority */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 ${
                        isProduct
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : isNetwork
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      {isProduct && <Boxes className="w-3 h-3 text-blue-600" />}
                      {isNetwork && <Wifi className="w-3 h-3 text-emerald-600" />}
                      {!isProduct && !isNetwork && <Headphones className="w-3 h-3 text-indigo-600" />}
                      {rec.squad} Team
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isCritical
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {rec.priorityLabel}
                    </span>
                  </div>

                  {/* Topic Title */}
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    {rec.topic || rec.issue}
                  </h4>

                  {/* Root Cause & Remedy */}
                  <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
                    <p>
                      <strong className="text-slate-800 font-semibold">Root Cause: </strong>
                      <span className="text-slate-600">{rec.root_cause || rec.likely_root_cause}</span>
                    </p>
                    <p className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                      <strong className="text-blue-700 font-semibold">Recommended Fix: </strong>
                      {rec.suggested_remedy || rec.recommended_fix}
                    </p>
                  </div>
                </div>

                {/* Footer Impact */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {rec.estimated_impact || 'Reduces friction by 18.5%'}
                  </span>
                  <button
                    onClick={() => setIsChatDrawerOpen(true)}
                    className="text-blue-600 font-bold hover:underline flex items-center gap-0.5 text-[10px]"
                  >
                    Drilldown <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
