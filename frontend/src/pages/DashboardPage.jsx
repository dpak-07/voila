import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  GitCompare, 
  RefreshCw, 
  ShieldCheck, 
  Layers, 
  FileDown, 
  Sparkles,
  AlertCircle,
  UploadCloud,
  ArrowUpRight,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { analyticsApi } from '../api/analytics';
import { useRun } from '../context/RunContext';
import { KpiCard } from '../components/dashboard/KpiCard';
import { SentimentChart } from '../components/dashboard/SentimentChart';
import { SentimentDonut } from '../components/dashboard/SentimentDonut';
import { ServiceVelocityTrend } from '../components/dashboard/ServiceVelocityTrend';
import { KpiPillarsGrid } from '../components/dashboard/KpiPillarsGrid';
import { PainPointsList } from '../components/dashboard/PainPointsList';
import { IssueMatrix } from '../components/dashboard/IssueMatrix';
import { ExecutiveSummary } from '../components/dashboard/ExecutiveSummary';
import { DimensionMatrix } from '../components/dashboard/DimensionMatrix';
import { TopicQuadrantMatrix } from '../components/dashboard/TopicQuadrantMatrix';
import { UnifiedRegionalIntelligence } from '../components/dashboard/UnifiedRegionalIntelligence';
import { PriorityActionBoard } from '../components/dashboard/PriorityActionBoard';
import { SlaLatencyDistribution } from '../components/dashboard/SlaLatencyDistribution';
import { DatasetCompareModal } from '../components/dashboard/DatasetCompareModal';
import { LoadingSkeleton, DashboardSkeleton } from '../components/common/LoadingSkeleton';
import { GlobalLoadingScreen } from '../components/common/GlobalLoadingScreen';
import { ExecutiveSummaryBanner } from '../components/dashboard/ExecutiveSummaryBanner';
import { ComparativeVarianceStrip } from '../components/dashboard/ComparativeVarianceStrip';
import { RootCauseSection } from '../components/dashboard/RootCauseSection';
import { InteractiveQualityRadar } from '../components/dashboard/InteractiveQualityRadar';
import { InteractiveCrossRegionalMatrix } from '../components/dashboard/InteractiveCrossRegionalMatrix';
import { SpikeDetectionBanner } from '../components/dashboard/SpikeDetectionBanner';
import { ProxyMethodologyModal } from '../components/dashboard/ProxyMethodologyModal';

export function DashboardPage() {
  const { activeRunId, activeRun, runs, totalCombinedRecords, isLoadingRuns, filters, updateFilter, dateRangeInfo, setDateRangeInfo, selectedCompany, setSelectedCompany } = useRun();
  const navigate = useNavigate();
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  const effectiveRunId = activeRunId === 'all' ? undefined : activeRunId;

  // TanStack Query: Fetch Main KPIs & Analytics Bundle
  const queryClient = useQueryClient();
  const { 
    data: kpiData, 
    isLoading: isLoadingKpis, 
    isFetching: isFetchingKpis,
    isError: isKpiError, 
    error: kpiError,
    refetch: refetchKpis 
  } = useQuery({
    queryKey: ['analytics_kpis', activeRunId, filters.time_period, filters.year, filters.month, filters.start_year, filters.end_year, filters.start_date, filters.end_date, filters.company, filters.product, filters.region],
    queryFn: () => analyticsApi.getKpis({
      run_id: effectiveRunId,
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
    placeholderData: (previousData) => previousData,
    staleTime: 60000,
  });

  // Sync dataset date range metadata into global context (deduplicated by setDateRangeInfo)
  useEffect(() => {
    if (kpiData?.date_range) {
      setDateRangeInfo(kpiData.date_range);
    }
  }, [kpiData?.date_range, setDateRangeInfo]);

  const kpis = kpiData?.kpis || {};
  const pillars = kpiData?.kpi_pillars || {};
  const sentimentDist = kpiData?.sentiment_distribution || {};
  const painPoints = Array.isArray(kpiData?.customer_pain_points) ? kpiData.customer_pain_points : [];
  const topicSummaries = Array.isArray(kpiData?.topic_summaries) ? kpiData.topic_summaries : [];
  const emergingIssues = Array.isArray(kpiData?.emerging_issues) ? kpiData.emerging_issues : [];
  const recurringIssues = Array.isArray(kpiData?.recurring_issues) ? kpiData.recurring_issues : [];
  const newIssues = Array.isArray(kpiData?.new_issues) ? kpiData.new_issues : [];
  const dimensions = kpiData?.dimension_breakdowns || {};
  const llmSummary = typeof kpiData?.llm_summary === 'string' ? kpiData.llm_summary : '';
  const recommendations = Array.isArray(kpiData?.recommendations) ? kpiData.recommendations : [];
  const rootCauses = Array.isArray(kpiData?.root_cause_analysis) ? kpiData.root_cause_analysis : [];

  const rawTrends = kpiData?.trends || [];
  const totalRows = kpis.total_records ?? kpis.total_conversations ?? 0;
  const hasAnyIngestedData = (runs && runs.length > 0) || (totalCombinedRecords || 0) > 0 || totalRows > 0;

  // Auto-redirect to home onboarding screen (/) if database is completely empty
  useEffect(() => {
    if (!isLoadingKpis && !isLoadingRuns && !hasAnyIngestedData) {
      navigate('/', { replace: true });
    }
  }, [isLoadingKpis, isLoadingRuns, hasAnyIngestedData, navigate]);

  // Initial Cold-Start Skeleton Loading with smooth shimmering effects
  if ((isLoadingKpis && !kpiData) || isLoadingRuns) {
    return <DashboardSkeleton />;
  }

  // Full-page Zero State Onboarding ONLY when database is completely empty (no datasets exist)
  if (!isLoadingKpis && !hasAnyIngestedData) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center space-y-8 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)]">
          <UploadCloud className="w-8 h-8 text-indigo-400" />
        </div>

        <div className="max-w-xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Database Node Online · Ready for Data
          </div>
          <h2 className="font-display font-bold text-2xl text-white tracking-tight">
            No Customer Support Data Ingested Yet
          </h2>
          <p className="text-sm font-sans text-slate-400 leading-relaxed">
            To view voice-of-customer KPIs, sentiment timelines, and topic complaint clusters, upload your customer support CSV or Parquet export.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full text-left">
          <div className="p-4 rounded-2xl glass-card flex flex-col justify-between">
            <div>
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-mono font-bold mb-2">1</div>
              <h4 className="font-display font-semibold text-xs text-white">Upload Dataset</h4>
              <p className="text-[11px] font-sans text-slate-400 mt-1">Upload Twitter, Zendesk, or custom support conversation exports.</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl glass-card flex flex-col justify-between">
            <div>
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-mono font-bold mb-2">2</div>
              <h4 className="font-display font-semibold text-xs text-white">Real-Time Ingestion</h4>
              <p className="text-[11px] font-sans text-slate-400 mt-1">RoBERTa & BERTopic cluster complaints and compute true KPIs in memory.</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl glass-card flex flex-col justify-between">
            <div>
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-mono font-bold mb-2">3</div>
              <h4 className="font-display font-semibold text-xs text-white">Live Analytics</h4>
              <p className="text-[11px] font-sans text-slate-400 mt-1">Explore executive diagnoses, spike alerts, and customer verbatim citations.</p>
            </div>
          </div>
        </div>

        <Link
          to="/upload"
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-sans font-semibold text-sm hover:from-indigo-500 hover:to-violet-500 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.35)]"
        >
          <span>Upload Dataset & Launch Ingestion</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6 pb-12"
    >
      {/* Company Context Breadcrumb Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-xs"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="text-slate-400 dark:text-slate-500">Analytics scope:</span>
            {selectedCompany ? (
              <span className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                {selectedCompany}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                All Companies
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedCompany && (
            <button
              onClick={() => { setSelectedCompany(null); }}
              className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
            >
              Clear filter
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            {selectedCompany ? 'Change Company' : 'Company Picker'}
          </button>
        </div>
      </motion.div>
      {/* Proxy Transparency & Methodology Modal */}
      <ProxyMethodologyModal 
        isOpen={isMethodologyOpen} 
        onClose={() => setIsMethodologyOpen(false)} 
      />

      {/* Smooth Ambient Background Fetch Progress Bar */}
      <AnimatePresence>
        {isFetchingKpis && (
          <motion.div 
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 origin-left pointer-events-none shadow-[0_0_12px_rgba(99,102,241,0.5)]"
          />
        )}
      </AnimatePresence>

      {/* Creative Executive Command Hub Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-4 sm:p-5 rounded-3xl glass-card relative overflow-hidden space-y-4 shadow-xl border border-slate-200/90 dark:border-white/10"
      >
        {/* Subtle Ambient Background Glow Accent */}
        <div className="absolute top-0 right-1/4 w-96 h-32 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Intelligence Title + Live Telemetry Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Telemetry: {totalRows ? `${totalRows.toLocaleString()} msgs` : 'Synchronized'}
              </span>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-display tracking-tight flex items-center gap-2">
                <span>Voice-of-Customer Intelligence</span>
              </h1>
              <p className="text-xs font-sans text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time sentiment decomposition, algorithmic root cause discovery & SLA triage matrix
              </p>
            </div>
          </div>

          {/* Right: Time Horizon Granularity Selector + Tooling */}
          <div className="flex flex-wrap items-center gap-2.5 lg:self-center">
            {/* Time Horizon Segmented Control */}
            <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-sans shadow-2xs">
              {[
                { id: 'overall', label: 'All-Time' },
                { id: 'monthly', label: 'Monthly' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'daily', label: 'Daily' },
                { id: 'yearly', label: 'Yearly' },
              ].map((p) => {
                const isSelected = filters.time_period === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => updateFilter('time_period', p.id)}
                    className={`relative px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'text-indigo-900 dark:text-white font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="headerTimePill"
                        className="absolute inset-0 rounded-xl bg-white dark:bg-indigo-600/30 border border-slate-200/90 dark:border-indigo-500/40 shadow-xs dark:shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{p.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Inline Year Selector for Monthly & Yearly */}
            {(filters.time_period === 'monthly' || filters.time_period === 'yearly') && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950/70 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-white/10 text-xs shadow-2xs">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase">Year:</span>
                <select
                  value={filters.year || ''}
                  onChange={(e) => updateFilter('year', e.target.value ? Number(e.target.value) : null)}
                  className="bg-transparent text-xs font-medium text-slate-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Years</option>
                  {(dateRangeInfo?.available_years?.length ? dateRangeInfo.available_years : [2024, 2025, 2026]).map((yr) => (
                    <option key={yr} value={yr} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{yr}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Inline Year + Month Selector for Daily & Weekly */}
            {(filters.time_period === 'daily' || filters.time_period === 'weekly') && (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-950/70 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-white/10 text-xs shadow-2xs">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase">Year:</span>
                  <select
                    value={filters.year || ''}
                    onChange={(e) => updateFilter('year', e.target.value ? Number(e.target.value) : null)}
                    className="bg-transparent text-xs font-medium text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All</option>
                    {(dateRangeInfo?.available_years?.length ? dateRangeInfo.available_years : [2024, 2025, 2026]).map((yr) => (
                      <option key={yr} value={yr} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{yr}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1 border-l border-slate-200 dark:border-white/10 pl-2">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase">Month:</span>
                  <select
                    value={filters.month || ''}
                    onChange={(e) => updateFilter('month', e.target.value ? Number(e.target.value) : null)}
                    className="bg-transparent text-xs font-medium text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Months</option>
                    {[
                      { num: 1, name: 'Jan' }, { num: 2, name: 'Feb' }, { num: 3, name: 'Mar' },
                      { num: 4, name: 'Apr' }, { num: 5, name: 'May' }, { num: 6, name: 'Jun' },
                      { num: 7, name: 'Jul' }, { num: 8, name: 'Aug' }, { num: 9, name: 'Sep' },
                      { num: 10, name: 'Oct' }, { num: 11, name: 'Nov' }, { num: 12, name: 'Dec' }
                    ].map((m) => (
                      <option key={m.num} value={m.num} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Header Utility Actions */}
            <div className="flex items-center gap-1.5 pl-1">
              <button
                onClick={() => setIsMethodologyOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-colors text-xs font-medium cursor-pointer shadow-2xs"
                title="Inspect methodology & formulas"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Methodology</span>
              </button>

              <button
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['analytics_kpis'] });
                  queryClient.invalidateQueries({ queryKey: ['dataset_runs'] });
                  refetchKpis();
                }}
                className="p-1.5 rounded-xl bg-white dark:bg-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-colors cursor-pointer shadow-2xs"
                title="Refresh active telemetry metrics"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>


      {/* Empty Filter Notification */}
      {!isLoadingKpis && totalRows === 0 && hasAnyIngestedData && (
        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">No Customer Interactions Found for Active Filter</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                No records matched the selected combination of region, company, product, or time period.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              updateFilter('region', '');
              updateFilter('company', '');
              updateFilter('product', '');
              updateFilter('time_period', 'overall');
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs whitespace-nowrap shadow-xs transition-colors"
          >
            Clear Active Filters
          </button>
        </div>
      )}

      {/* 1. Core KPIs Row with Verified Confidence Indicators & Proxies (FIRST AT TOP) */}
      {isLoadingKpis ? (
        <LoadingSkeleton rows={1} height="h-28" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
          <KpiCard
            title="Avg Response Time"
            value={kpis.avg_response_time_minutes ?? kpis.avg_response_time}
            unit="min"
            confidence={kpis.metric_confidence?.avg_response_time_minutes || (kpis.avg_response_time_minutes !== undefined && kpis.avg_response_time_minutes !== null ? "measured" : "no_data_available")}
            sampleSize={totalRows}
            missingReason="Missing response timestamps"
            delta={kpis.response_time_delta_pct ?? null}
            whyChanged={kpis.response_time_delta_pct != null ? (kpis.response_time_delta_pct < 0 ? `Response latency improved by ${Math.abs(kpis.response_time_delta_pct).toFixed(1)}%.` : `Response latency increased by ${kpis.response_time_delta_pct.toFixed(1)}%.`) : null}
            isPositiveGood={false}
            description="Exact timestamp SLA"
            variant="amber"
            delay={0.05}
            onMethodologyClick={() => setIsMethodologyOpen(true)}
          />

          <KpiCard
            title="Resolution Rate"
            value={kpis.resolution_rate}
            unit="%"
            confidence={kpis.metric_confidence?.resolution_rate || "proxy"}
            sampleSize={totalRows}
            missingReason="Missing resolution markers"
            delta={kpis.resolution_delta_pct ?? null}
            whyChanged={kpis.resolution_delta_pct != null ? (kpis.resolution_delta_pct >= 0 ? `FCR improved by +${kpis.resolution_delta_pct.toFixed(1)}%.` : `FCR declined by ${kpis.resolution_delta_pct.toFixed(1)}%.`) : null}
            isPositiveGood={true}
            description="Thread closure proxy"
            variant="emerald"
            delay={0.1}
            onMethodologyClick={() => setIsMethodologyOpen(true)}
          />

          <KpiCard
            title="CSAT Index"
            value={kpis.csat_proxy ?? (sentimentDist.positive ? Math.round(sentimentDist.positive.percentage + 0.5 * (sentimentDist.neutral?.percentage || 0)) : null)}
            unit="%"
            confidence={kpis.metric_confidence?.csat_proxy || "proxy"}
            sampleSize={totalRows}
            missingReason="Missing sentiment stream"
            delta={kpis.csat_delta_pct ?? null}
            whyChanged={kpis.csat_delta_pct != null ? (kpis.csat_delta_pct >= 0 ? `CSAT gained +${kpis.csat_delta_pct.toFixed(1)}% driven by positive interactions.` : `CSAT dropped ${kpis.csat_delta_pct.toFixed(1)}%.`) : null}
            isPositiveGood={true}
            description="Sentiment polarity proxy"
            variant="indigo"
            delay={0.12}
            onMethodologyClick={() => setIsMethodologyOpen(true)}
          />

          <KpiCard
            title="Escalation Rate"
            value={kpis.escalation_rate}
            unit="%"
            confidence={kpis.metric_confidence?.escalation_rate || "proxy"}
            sampleSize={totalRows}
            missingReason="Missing escalation tags"
            delta={kpis.escalation_delta_pct ?? null}
            whyChanged={kpis.escalation_delta_pct != null ? (kpis.escalation_delta_pct <= 0 ? `Escalations reduced by ${Math.abs(kpis.escalation_delta_pct).toFixed(1)}%.` : `Escalation rate rose +${kpis.escalation_delta_pct.toFixed(1)}%.`) : null}
            isPositiveGood={false}
            description="Distress & urgent intent"
            variant="rose"
            delay={0.15}
            onMethodologyClick={() => setIsMethodologyOpen(true)}
          />

          <KpiCard
            title="Reopen Rate"
            value={kpis.reopen_rate}
            unit="%"
            confidence={kpis.metric_confidence?.reopen_rate || "proxy"}
            sampleSize={totalRows}
            missingReason="Missing thread continuity"
            delta={kpis.reopen_delta_pct ?? null}
            whyChanged={kpis.reopen_delta_pct != null ? (kpis.reopen_delta_pct <= 0 ? `Reopen rate decreased by ${Math.abs(kpis.reopen_delta_pct).toFixed(1)}%.` : `Ticket reopens grew +${kpis.reopen_delta_pct.toFixed(1)}%.`) : null}
            isPositiveGood={false}
            description="Post-agent customer replies"
            variant="orange"
            delay={0.2}
            onMethodologyClick={() => setIsMethodologyOpen(true)}
          />

          <KpiCard
            title="Negative Tone Share"
            value={sentimentDist.negative?.percentage ?? kpis.negative_sentiment_percentage}
            unit="%"
            confidence={kpis.metric_confidence?.negative_sentiment_percentage || (sentimentDist.negative ? "measured" : "no_data_available")}
            sampleSize={totalRows}
            missingReason="Missing sentiment classification"
            delta={kpis.negative_sentiment_delta_pct ?? null}
            whyChanged={kpis.negative_sentiment_delta_pct != null ? (kpis.negative_sentiment_delta_pct <= 0 ? `Customer dissatisfaction decreased by ${Math.abs(kpis.negative_sentiment_delta_pct).toFixed(1)}%.` : `Negative sentiment climbed +${kpis.negative_sentiment_delta_pct.toFixed(1)}%.`) : null}
            isPositiveGood={false}
            description="Negative customer friction"
            variant="purple"
            delay={0.25}
            onMethodologyClick={() => setIsMethodologyOpen(true)}
          />
        </div>
      )}

      {/* Top Section: Executive Priority Action Queue & Small-Box Metric Pager */}
      {!isLoadingKpis && totalRows > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <PriorityActionBoard
            painPoints={painPoints}
            emergingIssues={emergingIssues}
            recurringIssues={recurringIssues}
            kpiPillars={pillars}
            totalRecords={totalRows}
          />
        </motion.div>
      )}

      {/* Top Section: Executive Plain-Language Summary Narrative */}
      {!isLoadingKpis && totalRows > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <ExecutiveSummaryBanner
            llmSummary={llmSummary}
            filters={filters}
            totalRecords={totalRows}
            kpis={kpis}
          />
        </motion.div>
      )}

      {/* Period-over-Period Variance & Causal Diagnostics Strip */}
      {!isLoadingKpis && totalRows > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <ComparativeVarianceStrip
            kpis={kpis}
            totalRecords={totalRows}
            timePeriod={filters.time_period}
          />
        </motion.div>
      )}

      {/* Error banner if query fails */}
      {isKpiError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Failed to load analytics: {kpiError?.message || 'Server error'}</span>
        </div>
      )}

      {/* 2. Visual Charts Row: Sentiment Timeline + Donut Distribution */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2">
          {isLoadingKpis ? (
            <LoadingSkeleton rows={1} height="h-80" />
          ) : (
            <SentimentChart trendsData={rawTrends} />
          )}
        </div>
        <div>
          {isLoadingKpis ? (
            <LoadingSkeleton rows={1} height="h-80" />
          ) : (
            <SentimentDonut distribution={sentimentDist} totalRecords={totalRows} />
          )}
        </div>
      </motion.div>

      {/* 3. SLA Response Latency Distribution & Compliance Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <SlaLatencyDistribution slaData={kpiData?.sla_distribution || []} />
      </motion.div>

      {/* 4. Integrated Geographic World Map & Regional SLA Performance Suite */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <UnifiedRegionalIntelligence 
          regionData={dimensions.by_region || dimensions.region || []} 
          totalRecords={totalRows} 
        />
      </motion.div>

      {/* 5. Interactive Cross-Regional Category Density & SLA Matrix */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <InteractiveCrossRegionalMatrix painPoints={painPoints} regionData={dimensions.by_region || []} />
      </motion.div>

      {/* 6. Service Velocity & Resolution Throughput Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <ServiceVelocityTrend trendsData={rawTrends} />
      </motion.div>

      {/* 7. Operational Service Quality Multi-Axial Radar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <InteractiveQualityRadar kpis={kpis} pillars={pillars} />
      </motion.div>

      {/* 8. Operational Pillars Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <KpiPillarsGrid pillars={pillars} />
      </motion.div>

      {/* 9. Topic Volume vs. Friction Quadrant Matrix */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <TopicQuadrantMatrix topicSummaries={painPoints.length > 0 ? painPoints : topicSummaries} />
      </motion.div>

      {/* 10. Ranked Customer Pain Points & LLM Executive Synthesis */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <PainPointsList painPoints={painPoints} topicSummaries={topicSummaries} />
        <ExecutiveSummary
          llmSummary={llmSummary}
          recommendations={recommendations}
          rootCauseAnalysis={rootCauses}
        />
      </motion.div>

      {/* 11. Dedicated Systemic Root Cause Analysis (RCA) Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <RootCauseSection rootCauses={rootCauses} />
      </motion.div>

      {/* 12. Issue Matrix: Emerging, Recurring, New */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <IssueMatrix
          emergingIssues={emergingIssues}
          recurringIssues={recurringIssues}
          newIssues={newIssues}
        />
      </motion.div>

      {/* 13. Product x Brand Breakdown Matrix */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <DimensionMatrix dimensionBreakdowns={dimensions} />
      </motion.div>

      {/* Cross-Run Dataset Compare Modal */}
      <DatasetCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        runs={runs}
        activeRunId={activeRunId}
      />
    </motion.div>
  );
}

export default DashboardPage;
