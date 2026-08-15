import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  ArrowUpRight
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
import { RegionalFrictionChart } from '../components/dashboard/RegionalFrictionChart';
import { SlaLatencyDistribution } from '../components/dashboard/SlaLatencyDistribution';
import { DatasetCompareModal } from '../components/dashboard/DatasetCompareModal';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ExecutiveSummaryBanner } from '../components/dashboard/ExecutiveSummaryBanner';
import { RootCauseSection } from '../components/dashboard/RootCauseSection';
import { InteractiveQualityRadar } from '../components/dashboard/InteractiveQualityRadar';
import { InteractiveCrossRegionalMatrix } from '../components/dashboard/InteractiveCrossRegionalMatrix';
import { SpikeDetectionBanner } from '../components/dashboard/SpikeDetectionBanner';

export function DashboardPage() {
  const { activeRunId, activeRun, runs, filters, setDateRangeInfo } = useRun();
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const effectiveRunId = activeRunId === 'all' ? undefined : activeRunId;

  // TanStack Query: Fetch Main KPIs & Analytics Bundle
  // TanStack Query: Fetch Main KPIs & Analytics Bundle (Unified Single Query)
  const { 
    data: kpiData, 
    isLoading: isLoadingKpis, 
    isError: isKpiError, 
    error: kpiError,
    refetch: refetchKpis 
  } = useQuery({
    queryKey: ['analytics_kpis', activeRunId, filters.time_period, filters.year, filters.month, filters.start_year, filters.end_year, filters.start_date, filters.end_date, filters.company, filters.product, filters.region],
    queryFn: () => analyticsApi.getKpis({
      run_id: effectiveRunId,
      time_period: filters.time_period,
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
    staleTime: 60000,
  });

  // Sync dataset date range metadata into global context
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
  const totalRows = kpis.total_records ?? (activeRun?.total_records || 0);

  // Full-page Zero State Onboarding when no data is ingested in database
  if (!isLoadingKpis && (totalRows === 0 || (!activeRunId && runs.length === 0))) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center space-y-8 animate-fadeIn">
        <div className="w-20 h-20 rounded-3xl bg-signal-emerald/10 border border-signal-emerald/30 flex items-center justify-center shadow-signal-emerald">
          <UploadCloud className="w-10 h-10 text-signal-emerald" />
        </div>

        <div className="max-w-xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-void-900 border border-slate-800 text-[11px] font-mono text-signal-cyan">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-cyan animate-ping" />
            Clean Database Node Initialized
          </div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-100 tracking-tight">
            No Customer Support Data Ingested Yet
          </h2>
          <p className="text-sm font-sans text-slate-300 leading-relaxed">
            The database is clean. To view voice-of-customer KPIs, sentiment timelines, and BERTopic complaint clusters, upload your customer support CSV export first.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full text-left">
          <div className="p-4 rounded-xl bg-void-900/90 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-6 h-6 rounded-full bg-signal-emerald/20 text-signal-emerald flex items-center justify-center text-xs font-mono font-bold mb-2">1</div>
              <h4 className="font-display font-semibold text-xs text-slate-200">Upload CSV</h4>
              <p className="text-[11px] font-mono text-slate-400 mt-1">Upload Twitter, Zendesk, or custom support conversation exports.</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-void-900/90 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-6 h-6 rounded-full bg-signal-cyan/20 text-signal-cyan flex items-center justify-center text-xs font-mono font-bold mb-2">2</div>
              <h4 className="font-display font-semibold text-xs text-slate-200">Real-Time Ingestion</h4>
              <p className="text-[11px] font-mono text-slate-400 mt-1">RoBERTa & BERTopic cluster complaints and compute true KPIs in memory.</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-void-900/90 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-6 h-6 rounded-full bg-signal-purple/20 text-signal-purple flex items-center justify-center text-xs font-mono font-bold mb-2">3</div>
              <h4 className="font-display font-semibold text-xs text-slate-200">Live Analytics</h4>
              <p className="text-[11px] font-mono text-slate-400 mt-1">Explore LLM executive diagnoses, spike alerts, and RAG conversation evidence.</p>
            </div>
          </div>
        </div>

        <Link
          to="/upload"
          className="px-6 py-3.5 rounded-xl bg-signal-emerald text-void-950 font-display font-bold text-sm hover:bg-emerald-400 transition-all flex items-center gap-2.5 shadow-signal-emerald"
        >
          <span>Upload Dataset & Launch Ingestion</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner: Run Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl signal-card">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-zinc-900 animate-ping" />
            <h2 className="font-display font-extrabold text-xl text-zinc-900 tracking-tight">
              Voice-of-Customer Signal Intelligence
            </h2>
          </div>
          <p className="text-xs font-mono text-zinc-500">
            Active Dataset: <span className="text-zinc-900 font-bold">#{activeRunId ? activeRunId.slice(0, 8) : 'GLOBAL'}</span>
            {' · '}
            {totalRows ? `${totalRows.toLocaleString()} messages ingested` : 'Synchronized Live'}
            {' · '}
            Time Granularity: <span className="capitalize text-zinc-800 font-semibold">{filters.time_period}</span>
          </p>
        </div>

        {/* Compare Runs Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCompareOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 transition-colors text-xs font-mono font-semibold shadow-2xs"
          >
            <GitCompare className="w-3.5 h-3.5 text-zinc-900" />
            <span>Dataset Delta (Compare)</span>
          </button>

          <button
            onClick={() => refetchKpis()}
            className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 border border-zinc-300 transition-colors shadow-2xs"
            title="Refresh active metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Section: Executive Plain-Language Summary Narrative */}
      {!isLoadingKpis && totalRows > 0 && (
        <ExecutiveSummaryBanner
          llmSummary={llmSummary}
          filters={filters}
          totalRecords={totalRows}
          kpis={kpis}
        />
      )}

      {/* Top Section: Statistical Z-Score Spike & Velocity Surge Tracker */}
      {!isLoadingKpis && emergingIssues.length > 0 && (
        <SpikeDetectionBanner
          emergingIssues={emergingIssues}
          totalRecords={totalRows}
        />
      )}

      {/* Error banner if query fails */}
      {isKpiError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Failed to load analytics: {kpiError?.message || 'Server error'}</span>
        </div>
      )}

      {/* 1. Core KPIs Row */}
      {isLoadingKpis ? (
        <LoadingSkeleton rows={1} height="h-28" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            title="Avg Response Time"
            value={kpis.avg_response_time_minutes ?? kpis.avg_response_time}
            unit="min"
            confidence={kpis.avg_response_time_minutes !== undefined && kpis.avg_response_time_minutes !== null ? "measured" : "no_data_available"}
            sampleSize={totalRows}
            missingReason="Missing response timestamps"
            delta={kpis.response_time_delta_pct ?? null}
            isPositiveGood={false}
            description="First response speed"
            variant="amber"
            delay={0.05}
          />

          <KpiCard
            title="Resolution Rate"
            value={kpis.resolution_rate}
            unit="%"
            confidence={kpis.resolution_rate !== undefined && kpis.resolution_rate !== null ? "measured" : "no_data_available"}
            sampleSize={totalRows}
            missingReason="Missing resolution markers"
            delta={kpis.resolution_delta_pct ?? null}
            isPositiveGood={true}
            description="Resolved tickets"
            variant="emerald"
            delay={0.1}
          />

          <KpiCard
            title="Escalation Rate"
            value={kpis.escalation_rate}
            unit="%"
            confidence={kpis.escalation_rate !== undefined && kpis.escalation_rate !== null ? "measured" : "no_data_available"}
            sampleSize={totalRows}
            missingReason="Missing escalation tags"
            delta={kpis.escalation_delta_pct ?? null}
            isPositiveGood={false}
            description="Manager escalations"
            variant="rose"
            delay={0.15}
          />

          <KpiCard
            title="Reopen Rate"
            value={kpis.reopen_rate}
            unit="%"
            confidence={kpis.reopen_rate !== undefined && kpis.reopen_rate !== null ? "measured" : "no_data_available"}
            sampleSize={totalRows}
            missingReason="Missing thread continuity"
            delta={kpis.reopen_delta_pct ?? null}
            isPositiveGood={false}
            description="Reopened threads"
            variant="orange"
            delay={0.2}
          />

          <KpiCard
            title="Negative Tone Share"
            value={sentimentDist.negative?.percentage ?? kpis.negative_sentiment_percentage}
            unit="%"
            confidence={sentimentDist.negative ? "measured" : "no_data_available"}
            sampleSize={totalRows}
            missingReason="Missing sentiment classification"
            delta={null}
            isPositiveGood={false}
            description="Negative customer friction"
            variant="purple"
            delay={0.25}
          />
        </div>
      )}

      {/* 2. Visual Charts Row: Sentiment Timeline + Donut Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
      </div>

      {/* 3. SLA Response Latency Distribution & Compliance Breakdown */}
      <SlaLatencyDistribution slaData={kpiData?.sla_distribution || []} />

      {/* 4. Global Geographic Friction & Regional SLA Performance */}
      <RegionalFrictionChart regionData={dimensions.by_region || dimensions.region || []} />

      {/* 5. Interactive Cross-Regional Category Density & SLA Matrix */}
      <InteractiveCrossRegionalMatrix painPoints={painPoints} regionData={dimensions.by_region || []} />

      {/* 6. Service Velocity & Resolution Throughput Trend */}
      <ServiceVelocityTrend trendsData={rawTrends} />

      {/* 7. Operational Service Quality Multi-Axial Radar */}
      <InteractiveQualityRadar kpis={kpis} pillars={pillars} />

      {/* 8. Operational Pillars Grid */}
      <KpiPillarsGrid pillars={pillars} />

      {/* 9. Topic Volume vs. Friction Quadrant Matrix */}
      <TopicQuadrantMatrix topicSummaries={painPoints.length > 0 ? painPoints : topicSummaries} />

      {/* 10. Ranked Customer Pain Points & LLM Executive Synthesis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PainPointsList painPoints={painPoints} topicSummaries={topicSummaries} />
        <ExecutiveSummary
          llmSummary={llmSummary}
          recommendations={recommendations}
          rootCauseAnalysis={rootCauses}
        />
      </div>

      {/* 9. Dedicated Systemic Root Cause Analysis (RCA) Section */}
      <RootCauseSection rootCauses={rootCauses} />

      {/* 10. Issue Matrix: Emerging, Recurring, New */}
      <IssueMatrix
        emergingIssues={emergingIssues}
        recurringIssues={recurringIssues}
        newIssues={newIssues}
      />

      {/* 10. Product x Brand Breakdown Matrix */}
      <DimensionMatrix dimensionBreakdowns={dimensions} />

      {/* Cross-Run Dataset Compare Modal */}
      <DatasetCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        runs={runs}
        activeRunId={activeRunId}
      />
    </div>
  );
}

export default DashboardPage;
