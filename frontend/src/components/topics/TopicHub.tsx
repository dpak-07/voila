import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TopicSummary } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { TopicDrilldownModal } from './TopicDrilldownModal';
import { RootCauseCard } from './RootCauseCard';
import {
  Flame,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Target,
  Search,
  ChevronRight,
  Filter,
  Eye,
} from 'lucide-react';

type TopicTab = 'pain' | 'emerging' | 'recurring' | 'new' | 'priorities';

export const TopicHub: React.FC = () => {
  const { data } = useApp();
  const [activeTab, setActiveTab] = useState<TopicTab>('pain');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<TopicSummary | null>(null);

  const topics = data?.topic_summaries || [];
  const emerging = data?.emerging_issues || [];
  const recurring = data?.recurring_issues || [];
  const newIssues = data?.new_issues || [];
  const priorities = data?.priorities || [];

  // Filter topics based on search query
  const filteredTopics = topics.filter((t) =>
    (t.topic || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.keywords || []).some((kw) => kw.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-card/95 backdrop-blur-xl border border-surface-border p-2 rounded-xl">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('pain')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap ${
              activeTab === 'pain'
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                : 'text-slate-400 hover:text-white hover:bg-surface-50'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Customer Pain Points ({topics.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('emerging')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap ${
              activeTab === 'emerging'
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                : 'text-slate-400 hover:text-white hover:bg-surface-50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>Emerging Issues (&gt;20%)</span>
          </button>

          <button
            onClick={() => setActiveTab('recurring')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap ${
              activeTab === 'recurring'
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                : 'text-slate-400 hover:text-white hover:bg-surface-50'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Recurring Issues</span>
          </button>

          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap ${
              activeTab === 'new'
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                : 'text-slate-400 hover:text-white hover:bg-surface-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Issues Detected</span>
          </button>

          <button
            onClick={() => setActiveTab('priorities')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap ${
              activeTab === 'priorities'
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                : 'text-slate-400 hover:text-white hover:bg-surface-50'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-indigo-400" />
            <span>Prioritization Matrix</span>
          </button>
        </div>

        {/* Search Slicer Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search topic or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-100/90 border border-surface-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition"
          />
        </div>
      </div>

      {/* Tab 1: Customer Pain Points */}
      {activeTab === 'pain' && (
        <div className="pbi-card overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-border text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-surface-100/40">
                <th className="py-3 px-4">Ranked Topic Cluster & Keywords</th>
                <th className="py-3 px-4">Case Volume</th>
                <th className="py-3 px-4">Negative Friction</th>
                <th className="py-3 px-4">Escalations</th>
                <th className="py-3 px-4">Mean Latency</th>
                <th className="py-3 px-4">Priority SLA</th>
                <th className="py-3 px-4 text-right">Drilldown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/40 text-xs text-slate-300">
              {filteredTopics.map((t, idx) => (
                <tr key={t.topic_id || idx} className="hover:bg-surface-100/50 transition">
                  <td className="py-3.5 px-4 max-w-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-surface-100 font-bold text-slate-400 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-white leading-snug">{t.topic}</p>
                        {t.keywords && t.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {t.keywords.slice(0, 3).map((kw, k) => (
                              <span key={k} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-100 text-cyan-300 border border-surface-border/60">
                                #{kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-white">
                    {(t.volume || t.case_count || 0).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      {t.negative_percentage || 0}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-amber-400">
                      {t.escalation_rate || 0}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {t.avg_response_time || 14.2} min
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={t.priority || (t.negative_percentage && t.negative_percentage > 50 ? 'Critical' : 'Medium')} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedTopic(t)}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-primary-500/10 hover:bg-primary-500/20 text-primary-300 border border-primary-500/30 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Explore</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Emerging Issues */}
      {activeTab === 'emerging' && (
        <div className="pbi-card overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-border text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-surface-100/40">
                <th className="py-3 px-4">Emerging Anomaly Cluster</th>
                <th className="py-3 px-4">Growth Surge Rate</th>
                <th className="py-3 px-4">Volume Delta</th>
                <th className="py-3 px-4">Negative Friction</th>
                <th className="py-3 px-4">Escalation Risk</th>
                <th className="py-3 px-4">Action Urgency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/40 text-xs text-slate-300">
              {emerging.map((em, idx) => (
                <tr key={idx} className="hover:bg-surface-100/50 transition">
                  <td className="py-3.5 px-4 max-w-sm">
                    <p className="font-bold text-white leading-snug">{em.topic}</p>
                    {em.keywords && em.keywords.length > 0 && (
                      <span className="text-[10px] font-mono text-cyan-300">
                        Keywords: {em.keywords.join(', ')}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-extrabold text-rose-400 bg-rose-500/15 px-2.5 py-1 rounded-md border border-rose-500/30 text-xs inline-flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> +{em.growth_rate_percentage}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="text-white font-bold">{em.current_volume.toLocaleString()}</span>{' '}
                    <span className="text-slate-500">(prev: {em.previous_volume})</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-rose-300 font-mono">
                    {em.negative_complaints.toLocaleString()} cases
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={em.escalation_risk} />
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-xs font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {em.action_urgency}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Recurring Issues */}
      {activeTab === 'recurring' && (
        <div className="pbi-card overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-border text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-surface-100/40">
                <th className="py-3 px-4">Recurring Issue Signature</th>
                <th className="py-3 px-4">Total Recurrences</th>
                <th className="py-3 px-4">Reopen Probability</th>
                <th className="py-3 px-4">Avg SLA Bottleneck</th>
                <th className="py-3 px-4">Investigation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/40 text-xs text-slate-300">
              {recurring.map((rec, idx) => (
                <tr key={idx} className="hover:bg-surface-100/50 transition">
                  <td className="py-3.5 px-4 font-bold text-white max-w-sm">
                    {rec.topic}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-amber-300">
                    {rec.total_recurrences} instances
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      {rec.reopen_probability}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {rec.avg_resolution_bottleneck_min} min delay
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={rec.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: New Issues Detected */}
      {activeTab === 'new' && (
        <div className="pbi-card overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-border text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-surface-100/40">
                <th className="py-3 px-4">Newly Detected Issue</th>
                <th className="py-3 px-4">Initial Volume</th>
                <th className="py-3 px-4">Severity Level</th>
                <th className="py-3 px-4">First Detected</th>
                <th className="py-3 px-4">Source Channel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/40 text-xs text-slate-300">
              {newIssues.map((ni, idx) => (
                <tr key={idx} className="hover:bg-surface-100/50 transition">
                  <td className="py-3.5 px-4 font-bold text-white max-w-sm">
                    {ni.topic}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">
                    {ni.initial_volume} inquiries
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={ni.severity_level} />
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                    {ni.first_detected}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {ni.source_channel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: Issue Prioritization Matrix */}
      {activeTab === 'priorities' && (
        <div className="pbi-card overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-border text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-surface-100/40">
                <th className="py-3 px-4">Queue Rank</th>
                <th className="py-3 px-4">Target Issue Cluster</th>
                <th className="py-3 px-4">Case Load</th>
                <th className="py-3 px-4">Negative Friction</th>
                <th className="py-3 px-4">SLA Target Protocol</th>
                <th className="py-3 px-4">Assigned Squad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/40 text-xs text-slate-300">
              {priorities.map((p, idx) => (
                <tr key={idx} className="hover:bg-surface-100/50 transition">
                  <td className="py-3.5 px-4">
                    <span className="w-7 h-7 rounded-lg bg-primary-500/20 text-primary-300 font-extrabold flex items-center justify-center border border-primary-500/30">
                      #{p.rank}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white max-w-sm">
                    {p.topic}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-200">
                    {p.case_volume.toLocaleString()} cases
                  </td>
                  <td className="py-3.5 px-4 font-bold text-rose-400 font-mono">
                    {p.negative_complaints.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-100 text-indigo-300 border border-indigo-500/30">
                      {p.sla_response_target}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-300">
                    {p.owner_team}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Root Cause Analysis Cards Section */}
      <RootCauseCard />

      {/* Utterance Drilldown Modal */}
      {selectedTopic && (
        <TopicDrilldownModal
          topic={selectedTopic}
          onClose={() => setSelectedTopic(null)}
        />
      )}
    </div>
  );
};
