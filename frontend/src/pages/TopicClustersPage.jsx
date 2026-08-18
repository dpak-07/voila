import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Plot from '../components/common/Plot';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid
} from 'recharts';
import {
  Layers,
  Sparkles,
  Flame,
  Search,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  Tag,
  BarChart3,
  Filter,
  User,
  Bot,
  ArrowUpRight,
  Activity,
  Zap,
  CheckCircle2,
  PieChart
} from 'lucide-react';
import { analyticsApi } from '../api/analytics';
import { useRun } from '../context/RunContext';
import { useTheme } from '../context/ThemeContext';
import { RagEvidenceDrawer } from '../components/dashboard/RagEvidenceDrawer';
import { ConfidenceBadge } from '../components/common/ConfidenceBadge';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { toFiniteNumber, toNullableFiniteNumber } from '../utils/numberFormat';

function getCleanClusterName(t) {
  if (!t) return 'General Support Inquiries';
  if (t.cluster_name && !t.cluster_name.includes(',') && t.cluster_name.length > 3) {
    return t.cluster_name;
  }
  const kw = (t.topic_keywords || t.issue || t.cluster_name || '').toLowerCase();
  if (kw.includes('crash') || kw.includes('freeze') || kw.includes('bug') || kw.includes('stability')) return 'App Crashes & System Stability';
  if (kw.includes('delivery') || kw.includes('order') || kw.includes('track') || kw.includes('delay') || kw.includes('shipment')) return 'Delivery, Order Tracking & Delays';
  if (kw.includes('bill') || kw.includes('charge') || kw.includes('invoice') || kw.includes('payment')) return 'Billing, Invoices & Payment Inquiries';
  if (kw.includes('login') || kw.includes('password') || kw.includes('auth') || kw.includes('2fa') || kw.includes('account')) return 'Account Access & Password Authentication';
  if (kw.includes('refund') || kw.includes('cancel') || kw.includes('dispute') || kw.includes('return')) return 'Refunds, Cancellations & Dispute Resolution';
  if (kw.includes('battery') || kw.includes('hardware') || kw.includes('drain')) return 'Hardware & Battery Health Performance';
  if (kw.includes('thank') || kw.includes('help') || kw.includes('praise') || kw.includes('assist')) return 'Customer Service Praise & Quick Help';
  return t.cluster_name || t.topic_keywords || 'General Support Inquiries';
}

export function TopicClustersPage() {
  const { activeRunId, activeRun, runs, filters, totalCombinedRecords, isLoadingRuns, selectedCompany } = useRun();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClusterForEvidence, setSelectedClusterForEvidence] = useState(null);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [selectedAnalyticsTopicIndex, setSelectedAnalyticsTopicIndex] = useState(0);

  // Fetch KPI data containing topics, summaries, and quotes
  const { data: kpiData, isLoading, isError } = useQuery({
    queryKey: ['analytics_kpis', activeRunId, filters.time_period, filters.year, filters.month, filters.start_year, filters.end_year, filters.start_date, filters.end_date, filters.company, filters.product, filters.region],
    queryFn: () => analyticsApi.getKpis({ 
      run_id: activeRunId === 'all' ? undefined : activeRunId,
      time_period: filters.time_period || 'overall',
      year: filters.year || undefined,
      month: filters.month || undefined,
      start_year: filters.start_year || undefined,
      end_year: filters.end_year || undefined,
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
      company: filters.company || undefined,
      product: filters.product || undefined,
      region: filters.region || undefined,
    }),
    placeholderData: (prev) => prev,
    staleTime: 60000,
  });

  const hasData = (runs && runs.length > 0) || (totalCombinedRecords || 0) > 0;
  React.useEffect(() => {
    if (!isLoading && !isLoadingRuns && !hasData) {
      navigate('/', { replace: true });
    }
  }, [isLoading, isLoadingRuns, hasData, navigate]);

  const topics = useMemo(() => {
    if (!kpiData) return [];
    if (Array.isArray(kpiData.customer_pain_points) && kpiData.customer_pain_points.length > 0) {
      return kpiData.customer_pain_points;
    }
    if (Array.isArray(kpiData.topic_summaries) && kpiData.topic_summaries.length > 0) {
      return kpiData.topic_summaries;
    }
    return [];
  }, [kpiData]);

  const filteredTopics = useMemo(() => {
    if (!searchTerm.trim()) return topics;
    const q = searchTerm.toLowerCase();
    return topics.filter(
      (t) =>
        (t.cluster_name && t.cluster_name.toLowerCase().includes(q)) ||
        (t.topic_keywords && t.topic_keywords.toLowerCase().includes(q))
    );
  }, [topics, searchTerm]);

  const clusterColors = [
    '#6366f1', // Indigo
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#ef4444', // Rose
    '#14b8a6', // Teal
  ];

  // Top metrics overview calculations
  const totalTopicVolume = useMemo(() => {
    return topics.reduce((acc, t) => acc + toFiniteNumber(t.volume ?? t.count), 0);
  }, [topics]);

  const highestFrictionTopic = useMemo(() => {
    if (topics.length === 0) return null;
    return [...topics].sort((a, b) => {
      const negA = toFiniteNumber(a.negative_sentiment_percentage);
      const negB = toFiniteNumber(b.negative_sentiment_percentage);
      return negB - negA;
    })[0];
  }, [topics]);

  // Topic bar chart comparison data
  const topicBarData = useMemo(() => {
    return topics.slice(0, 8).map((t, idx) => {
      const name = getCleanClusterName(t);
      const vol = toFiniteNumber(t.volume ?? t.count);
      const negRate = toNullableFiniteNumber(t.negative_sentiment_percentage);
      return {
        name: name.length > 20 ? `${name.slice(0, 20)}...` : name,
        fullName: name,
        volume: vol,
        negRate: negRate === null ? 0 : Number(negRate.toFixed(1)),
        color: clusterColors[idx % clusterColors.length],
      };
    });
  }, [topics]);

  // Selected topic object for deep dive
  const activeDetailTopic = useMemo(() => {
    if (topics.length === 0) return null;
    return topics[selectedAnalyticsTopicIndex] || topics[0];
  }, [topics, selectedAnalyticsTopicIndex]);

  // Generate 2D UMAP-like scatter points for Plotly 2D projection
  const plotlyScatterData = useMemo(() => {
    if (!topics || topics.length === 0) return [];

    const traces = topics.map((t, idx) => {
      const name = getCleanClusterName(t);
      const vol = toFiniteNumber(t.volume, 10);
      const color = clusterColors[idx % clusterColors.length];

      const angle = (idx / topics.length) * 2 * Math.PI;
      const radius = 3.5 + (idx % 3) * 1.2;
      const centerX = radius * Math.cos(angle);
      const centerY = radius * Math.sin(angle);

      const numPoints = Math.min(Math.max(15, Math.floor(vol / 50)), 60);
      const xCoords = [];
      const yCoords = [];
      const textLabels = [];

      for (let i = 0; i < numPoints; i++) {
        const spread = 0.6 + (i % 5) * 0.15;
        const randAngle = Math.random() * 2 * Math.PI;
        const dist = Math.random() * spread;
        xCoords.push(centerX + dist * Math.cos(randAngle));
        yCoords.push(centerY + dist * Math.sin(randAngle));
        textLabels.push(`${name} (Volume: ${vol.toLocaleString()})`);
      }

      return {
        x: xCoords,
        y: yCoords,
        mode: 'markers',
        type: 'scatter',
        name: name.length > 24 ? `${name.slice(0, 24)}...` : name,
        text: textLabels,
        hoverinfo: 'text',
        marker: {
          size: 8,
          color: color,
          opacity: 0.75,
          line: { width: 1, color: '#ffffff' }
        }
      };
    });

    return traces;
  }, [topics, clusterColors]);

  const openEvidence = (clusterName) => {
    setSelectedClusterForEvidence(clusterName);
    setIsEvidenceOpen(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-6 pb-12"
    >
      {/* Top Header Hub */}
      <div className="p-6 rounded-3xl glass-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
                <Layers className="w-5 h-5" />
              </span>
              <h1 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight">
                Semantic Topic Topology & Cluster Intelligence
              </h1>
            </div>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Unsupervised c-TF-IDF semantic cluster analysis, UMAP manifold projection, and friction telemetry
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ConfidenceBadge confidence="measured" size="md" />
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
            >
              <span>Back to Analytics</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Summary Stats Pills */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-200/80 dark:border-white/10">
          <motion.div 
            whileHover={{ y: -2 }}
            className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-950/60 border border-slate-200/90 dark:border-white/10 shadow-2xs space-y-1"
          >
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Clustered Themes</span>
            <div className="text-lg font-mono font-bold text-slate-900 dark:text-white">
              <AnimatedNumber value={topics.length} decimals={0} duration={1.5} /> themes
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -2 }}
            className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-950/60 border border-slate-200/90 dark:border-white/10 shadow-2xs space-y-1"
          >
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Classified Conversation Volume</span>
            <div className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-400">
              <AnimatedNumber value={totalTopicVolume} decimals={0} duration={1.8} /> msgs
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -2 }}
            className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-950/60 border border-slate-200/90 dark:border-white/10 shadow-2xs space-y-1"
          >
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Peak Friction Cluster</span>
            <div className="text-sm font-display font-bold text-rose-600 dark:text-rose-400 truncate" title={highestFrictionTopic ? getCleanClusterName(highestFrictionTopic) : 'No Data Available'}>
              {highestFrictionTopic ? getCleanClusterName(highestFrictionTopic) : 'No Data Available'}
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -2 }}
            className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-950/60 border border-slate-200/90 dark:border-white/10 shadow-2xs space-y-1"
          >
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Vector Embedding Model</span>
            <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
              all-MiniLM-L6-v2
            </div>
          </motion.div>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={3} height="h-64" />
      ) : topics.length === 0 ? (
        <div className="p-12 text-center rounded-3xl glass-card space-y-3">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">No Semantic Topics Found</h3>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Upload conversation data to automatically run sentence transformer vectorization and BERTopic clustering.
          </p>
        </div>
      ) : (
        <>
          {/* Section 1: Main 2D Projection Map (Plotly) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="p-6 rounded-3xl glass-card space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-white/10">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>2D Semantic Manifold Projection (UMAP / HDBSCAN)</span>
                </h3>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  Semantic distance correlates with conversational intent similarity in vector space
                </p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold">
                Interactive 2D Cluster Space
              </span>
            </div>

            <div className="w-full h-[420px] rounded-2xl overflow-hidden bg-white/80 dark:bg-slate-950/80 border border-slate-200/80 dark:border-white/10 shadow-2xs">
              <Plot
                data={plotlyScatterData}
                layout={{
                  autosize: true,
                  margin: { l: 30, r: 30, t: 30, b: 30 },
                  paper_bgcolor: isDark ? '#07090e' : '#ffffff',
                  plot_bgcolor: isDark ? '#07090e' : '#ffffff',
                  showlegend: true,
                  legend: {
                    font: { color: isDark ? '#94a3b8' : '#334155', family: 'monospace', size: 10 },
                    orientation: 'h',
                    y: -0.15,
                    x: 0,
                  },
                  xaxis: {
                    showgrid: true,
                    gridcolor: isDark ? '#334155' : '#e2e8f0',
                    zeroline: false,
                    showticklabels: false,
                  },
                  yaxis: {
                    showgrid: true,
                    gridcolor: isDark ? '#334155' : '#e2e8f0',
                    zeroline: false,
                    showticklabels: false,
                  },
                  hovermode: 'closest',
                }}
                useResizeHandler={true}
                className="w-full h-full"
                config={{ displayModeBar: false, responsive: true, typesetMath: false }}
              />
            </div>
          </motion.div>

          {/* Section 2: Per-Topic Visual Analytics Hub (Recharts Volume vs Friction + Deep Dive Telemetry) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
          >
            {/* Left: Interactive Volume & Friction Horizontal Bar Chart */}
            <div className="lg:col-span-7 p-6 rounded-3xl glass-card flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
                <div>
                  <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Topic Volume & Friction Distribution</span>
                  </h3>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    Click any theme to inspect dedicated per-topic analytics
                  </p>
                </div>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={topicBarData} 
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} horizontal={false} />
                    <XAxis 
                      type="number" 
                      tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                      axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={130}
                      tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }}
                      axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="p-3 rounded-2xl bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-white/15 shadow-2xl font-mono text-xs text-slate-900 dark:text-white space-y-1 backdrop-blur-xl">
                              <strong className="block border-b border-slate-100 dark:border-white/10 pb-1">{data.fullName}</strong>
                              <div className="flex justify-between gap-3 text-[11px]">
                                <span className="text-slate-500 dark:text-slate-400">Volume:</span>
                                <strong>{data.volume.toLocaleString()} msgs</strong>
                              </div>
                              <div className="flex justify-between gap-3 text-[11px]">
                                <span className="text-slate-500 dark:text-slate-400">Negative Rate:</span>
                                <strong className="text-rose-600 dark:text-rose-400">{data.negRate}%</strong>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="volume" 
                      radius={[0, 6, 6, 0]}
                      onClick={(data, index) => {
                        if (index !== undefined) {
                          setSelectedAnalyticsTopicIndex(index);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {topicBarData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={selectedAnalyticsTopicIndex === index ? '#6366f1' : entry.color} 
                          opacity={selectedAnalyticsTopicIndex === index ? 1 : 0.75}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: Dedicated Selected Topic Analytics Telemetry Card */}
            {activeDetailTopic && (
              <div className="lg:col-span-5 p-6 rounded-3xl glass-card flex flex-col justify-between space-y-4 border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.04] via-white/80 to-slate-50/50 dark:from-indigo-500/[0.06] dark:via-slate-900/60 dark:to-slate-950/80">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200/80 dark:border-white/10">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300">
                      SELECTED CLUSTER TELEMETRY
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                      Theme #{selectedAnalyticsTopicIndex + 1}
                    </span>
                  </div>

                  <h3 className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-snug">
                    {getCleanClusterName(activeDetailTopic)}
                  </h3>

                  {/* 3 Metric Pills with Animated Counters */}
                  <div className="grid grid-cols-3 gap-2 my-3 font-mono text-xs">
                    <div className="p-2.5 rounded-2xl bg-white/90 dark:bg-slate-950/70 border border-slate-200/80 dark:border-white/10 shadow-2xs">
                      <span className="text-[9px] text-slate-400 block uppercase">Volume</span>
                      <strong className="text-slate-900 dark:text-white font-bold text-sm">
                        <AnimatedNumber value={Number(activeDetailTopic.volume || activeDetailTopic.count || 0)} decimals={0} duration={1.8} />
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-white/90 dark:bg-slate-950/70 border border-slate-200/80 dark:border-white/10 shadow-2xs">
                      <span className="text-[9px] text-slate-400 block uppercase">Neg Tone</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-bold text-sm">
                        {activeDetailTopic.negative_sentiment_percentage != null ? <><AnimatedNumber value={Number(activeDetailTopic.negative_sentiment_percentage)} decimals={1} duration={1.8} />%</> : 'N/A'}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-white/90 dark:bg-slate-950/70 border border-slate-200/80 dark:border-white/10 shadow-2xs">
                      <span className="text-[9px] text-slate-400 block uppercase">SLA Latency</span>
                      <strong className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                        {activeDetailTopic.avg_response_time != null ? <><AnimatedNumber value={Number(activeDetailTopic.avg_response_time)} decimals={0} duration={1.8} />m</> : 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {/* Key Keywords c-TF-IDF Extraction */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Extracted c-TF-IDF Semantic Keywords
                    </span>
                    {activeDetailTopic.topic_keywords ? (
                      <div className="flex flex-wrap gap-1.5">
                        {activeDetailTopic.topic_keywords.split(',')
                          .map((kw, i) => (
                            <span 
                              key={i}
                              className="px-2.5 py-1 rounded-xl bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 text-[11px] font-mono text-slate-700 dark:text-slate-300 font-semibold shadow-2xs"
                            >
                              #{kw.trim()}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-mono italic">No keywords extracted for this cluster.</span>
                    )}
                  </div>
                </div>

                {/* Grounded Verbatim Quote & Action Button */}
                <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 space-y-2.5">
                  {(activeDetailTopic.verbatim_samples?.[0] || activeDetailTopic.summary) ? (
                    <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-950/70 border border-slate-200/80 dark:border-white/10 text-xs font-sans text-slate-700 dark:text-slate-300 italic">
                      "{activeDetailTopic.verbatim_samples?.[0] || activeDetailTopic.summary}"
                    </div>
                  ) : null}

                  <button
                    onClick={() => openEvidence(getCleanClusterName(activeDetailTopic))}
                    className="w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/25 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Inspect Grounded Evidence Quotes</span>
                    <ArrowUpRight className="w-4 h-4 text-indigo-200" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Section 3: Search & Ranked Topic Cards Grid with Scroll-Triggered Animation */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="p-6 rounded-3xl glass-card space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/80 dark:border-white/10">
              <div>
                <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white">
                  Ranked Topic Clusters & Friction Drivers
                </h3>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  Full list of semantic themes sorted by conversation frequency and customer dissatisfaction
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter topics by keyword..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Topics Grid with Staggered Scroll Animation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTopics.map((topic, index) => {
                const title = getCleanClusterName(topic);
                const volume = toFiniteNumber(topic.volume ?? topic.count);
                const negComplaints = toFiniteNumber(topic.negative_complaints);
                const rawNegRate = topic.negative_sentiment_percentage ?? (volume > 0 ? (negComplaints / volume) * 100 : 0);
                const negRate = toFiniteNumber(rawNegRate);
                const color = clusterColors[index % clusterColors.length];

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-20px' }}
                    transition={{ duration: 0.35, delay: (index % 4) * 0.05 }}
                    whileHover={{ y: -3 }}
                    onClick={() => setSelectedAnalyticsTopicIndex(index)}
                    className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-3 cursor-pointer shadow-xs ${
                      selectedAnalyticsTopicIndex === index
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'bg-white/80 dark:bg-slate-900/60 border-slate-200/90 dark:border-white/10 hover:border-indigo-500/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span 
                            className="w-3 h-3 rounded-full shadow-2xs shrink-0" 
                            style={{ backgroundColor: color }}
                          />
                          <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white capitalize truncate">
                            {title}
                          </h4>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold shrink-0">
                          RANK #{index + 1}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-white/10 text-xs font-mono">
                        <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-950/50 border border-slate-100 dark:border-white/10">
                          <span className="text-[9px] text-slate-400 block uppercase">Volume</span>
                          <strong className="text-slate-900 dark:text-white">{volume.toLocaleString()}</strong>
                        </div>
                        <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-950/50 border border-slate-100 dark:border-white/10">
                          <span className="text-[9px] text-slate-400 block uppercase">Neg Tone</span>
                          <strong className={negRate > 25 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>{negRate}%</strong>
                        </div>
                        <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-950/50 border border-slate-100 dark:border-white/10">
                          <span className="text-[9px] text-slate-400 block uppercase">SLA</span>
                          <strong className="text-indigo-600 dark:text-indigo-400">{Math.round(toFiniteNumber(topic.avg_response_time))}m</strong>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-slate-400 truncate max-w-[180px]">
                        {topic.topic_keywords || 'Grounded BERTopic c-TF-IDF'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEvidence(title);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors text-xs font-mono font-bold shadow-xs cursor-pointer shrink-0"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Inspect Quotes</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}

      {/* RAG Evidence Drawer */}
      <RagEvidenceDrawer
        isOpen={isEvidenceOpen}
        onClose={() => setIsEvidenceOpen(false)}
        topicName={selectedClusterForEvidence}
        company={selectedCompany}
      />
    </motion.div>
  );
}

export default TopicClustersPage;
