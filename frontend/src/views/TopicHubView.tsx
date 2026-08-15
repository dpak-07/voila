import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ViewHeader } from '../components/common/ViewHeader';
import { TopicSummary } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { TopicDrilldownModal } from '../components/topics/TopicDrilldownModal';
import { RootCauseCard } from '../components/topics/RootCauseCard';
import { motion, AnimatePresence } from 'framer-motion';
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
  Layers,
  ArrowUpRight,
  HelpCircle,
} from 'lucide-react';

type TopicTab = 'pain' | 'emerging' | 'recurring' | 'new' | 'priorities';

export const TopicHubView: React.FC = () => {
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
    (t.cluster_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.keywords || []).some((kw) => kw.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <ViewHeader
        category="Customer Intelligence & NLP"
        badge="HDBSCAN + TF-IDF"
        title="Voice-of-Customer Analytical Topics Hub"
        subtitle="Unsupervised semantic clustering, pain-point frequency rankings, emerging spike anomalies, and root-cause remedies."
      />

      {/* Navigation Toolbar & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-obsidian-850/95 backdrop-blur-xl border border-surface-border p-2.5 rounded-2xl shadow-md">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('pain')}
            className={`btn-action-tab ${
              activeTab === 'pain'
                ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-md shadow-primary-500/25'
                : 'text-slate-400 hover:text-white hover:bg-surface-100'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-400" />
            <span>Customer Pain Points ({topics.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('emerging')}
            className={`btn-action-tab ${
              activeTab === 'emerging'
                ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-md shadow-primary-500/25'
                : 'text-slate-400 hover:text-white hover:bg-surface-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span>Emerging Anomalies ({emerging.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('recurring')}
            className={`btn-action-tab ${
              activeTab === 'recurring'
                ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-md shadow-primary-500/25'
                : 'text-slate-400 hover:text-white hover:bg-surface-100'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            <span>Recurring Bottlenecks ({recurring.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('new')}
            className={`btn-action-tab ${
              activeTab === 'new'
                ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-md shadow-primary-500/25'
                : 'text-slate-400 hover:text-white hover:bg-surface-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>New Outbreaks ({newIssues.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('priorities')}
            className={`btn-action-tab ${
              activeTab === 'priorities'
                ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-md shadow-primary-500/25'
                : 'text-slate-400 hover:text-white hover:bg-surface-100'
            }`}
          >
            <Target className="w-4 h-4 text-indigo-400" />
            <span>Prioritization Queue ({priorities.length})</span>
          </button>
        </div>

        {/* Search Slicer Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search clusters or #keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-surface-100/90 border border-surface-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition shadow-inner"
          />
        </div>
      </div>

      {/* Tab 1: Customer Pain Points Table */}
      {activeTab === 'pain' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ranked Topic Cluster &amp; Salient Keywords</th>
                <th>Case Load</th>
                <th>Negative Friction</th>
                <th>Escalations</th>
                <th>Mean Latency</th>
                <th>Severity SLA</th>
                <th className="text-right">Transcript</th>
              </tr>
            </thead>
            <tbody>
              {filteredTopics.map((t, idx) => (
                <tr key={t.topic_id || idx}>
                  <td className="max-w-md">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-surface-100 font-mono font-extrabold text-slate-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5 border border-surface-border">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white leading-snug">{t.topic}</p>
                          {t.cluster_name && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-100 text-slate-400 border border-surface-border">
                              {t.cluster_name}
                            </span>
                          )}
                        </div>
                        {t.keywords && t.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {t.keywords.slice(0, 4).map((kw, k) => (
                              <span key={k} className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-surface-100/80 text-cyan-300 border border-cyan-500/20">
                                #{kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="font-mono font-extrabold text-white text-xs">
                    {(t.volume || t.case_count || 0).toLocaleString()}
                  </td>
                  <td>
                    <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 text-xs">
                      {t.negative_percentage || 0}%
                    </span>
                  </td>
                  <td>
                    <span className="font-mono font-semibold text-amber-400">
                      {t.escalation_rate || 0}%
                    </span>
                  </td>
                  <td className="font-mono text-slate-300">
                    {t.avg_response_time || 14.2} min
                  </td>
                  <td>
                    <StatusBadge status={t.priority || (t.negative_percentage && t.negative_percentage > 50 ? 'Critical' : 'Medium')} />
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => setSelectedTopic(t)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-primary-500/15 hover:bg-primary-500/30 text-primary-200 hover:text-white border border-primary-500/30 transition shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Drilldown</span>
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
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Emerging Anomaly Cluster</th>
                <th>Surge Growth Rate</th>
                <th>Volume Delta</th>
                <th>Negative Complaints</th>
                <th>Escalation Risk</th>
                <th>Urgency Directive</th>
              </tr>
            </thead>
            <tbody>
              {emerging.map((em, idx) => (
                <tr key={idx}>
                  <td className="max-w-md">
                    <p className="font-bold text-white leading-snug">{em.topic}</p>
                    {em.keywords && em.keywords.length > 0 && (
                      <span className="text-[10px] font-mono text-cyan-300 mt-1 block">
                        Keywords: {em.keywords.join(', ')}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="font-mono font-extrabold text-rose-400 bg-rose-500/15 px-2.5 py-1 rounded-lg border border-rose-500/30 text-xs inline-flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> +{em.growth_rate_percentage}%
                    </span>
                  </td>
                  <td className="font-mono">
                    <span className="text-white font-bold">{em.current_volume.toLocaleString()}</span>{' '}
                    <span className="text-slate-500">(prev: {em.previous_volume})</span>
                  </td>
                  <td className="font-mono font-bold text-rose-300">
                    {em.negative_complaints.toLocaleString()} cases
                  </td>
                  <td>
                    <StatusBadge status={em.escalation_risk} />
                  </td>
                  <td>
                    <span className="text-xs font-semibold text-amber-300 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
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
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Recurring Issue Pattern</th>
                <th>Total Recurrences</th>
                <th>Reopen Probability</th>
                <th>Mean Resolution Bottleneck</th>
                <th>Current Status</th>
              </tr>
            </thead>
            <tbody>
              {recurring.map((rec, idx) => (
                <tr key={idx}>
                  <td className="font-bold text-white max-w-md">
                    {rec.topic}
                  </td>
                  <td className="font-mono font-bold text-amber-300">
                    {rec.total_recurrences} instances
                  </td>
                  <td>
                    <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                      {rec.reopen_probability}%
                    </span>
                  </td>
                  <td className="font-mono text-slate-300">
                    {rec.avg_resolution_bottleneck_min} min delay
                  </td>
                  <td>
                    <StatusBadge status={rec.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: New Outbreak Issues */}
      {activeTab === 'new' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Newly Detected Outbreak</th>
                <th>Initial Volume</th>
                <th>Severity Level</th>
                <th>First Detected Timestamp</th>
                <th>Source Channel</th>
              </tr>
            </thead>
            <tbody>
              {newIssues.map((ni, idx) => (
                <tr key={idx}>
                  <td className="font-bold text-white max-w-md">
                    {ni.topic}
                  </td>
                  <td className="font-mono font-bold text-cyan-300">
                    {ni.initial_volume} inquiries
                  </td>
                  <td>
                    <StatusBadge status={ni.severity_level} />
                  </td>
                  <td className="font-mono text-slate-400 text-[11px]">
                    {ni.first_detected}
                  </td>
                  <td className="text-slate-300 font-medium">
                    {ni.source_channel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: Prioritization Queue Matrix */}
      {activeTab === 'priorities' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Queue Rank</th>
                <th>Target Issue Cluster</th>
                <th>Case Load</th>
                <th>Negative Complaints</th>
                <th>SLA Response Target</th>
                <th>Assigned Squad</th>
              </tr>
            </thead>
            <tbody>
              {priorities.map((p, idx) => (
                <tr key={idx}>
                  <td>
                    <span className="w-7 h-7 rounded-lg bg-primary-500/20 text-primary-300 font-mono font-extrabold flex items-center justify-center border border-primary-500/30 text-xs">
                      #{p.rank}
                    </span>
                  </td>
                  <td className="font-bold text-white max-w-md">
                    {p.topic}
                  </td>
                  <td className="font-mono text-slate-200">
                    {p.case_volume.toLocaleString()} cases
                  </td>
                  <td className="font-mono font-bold text-rose-400">
                    {p.negative_complaints.toLocaleString()}
                  </td>
                  <td>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-lg bg-surface-100 text-indigo-300 border border-indigo-500/30">
                      {p.sla_response_target}
                    </span>
                  </td>
                  <td className="font-medium text-slate-300">
                    {p.owner_team}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Root Cause & Remedy Action Plan */}
      <RootCauseCard />

      {/* Utterance Drilldown Modal */}
      {selectedTopic && (
        <TopicDrilldownModal
          topic={selectedTopic}
          onClose={() => setSelectedTopic(null)}
        />
      )}
    </motion.div>
  );
};
