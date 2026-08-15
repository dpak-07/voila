import React from 'react';
import { useApp } from '../context/AppContext';
import { DateRangeSlicer } from '../components/dashboard/DateRangeSlicer';
import { ExecutiveSummaryCard } from '../components/dashboard/ExecutiveSummaryCard';
import { PrimaryKpiGrid } from '../components/dashboard/PrimaryKpiGrid';
import { StrategicPillars } from '../components/dashboard/StrategicPillars';
import { SpikeAlertsSection } from '../components/dashboard/SpikeAlertsSection';
import { VolumeTrendsChart } from '../components/charts/VolumeTrendsChart';
import { SentimentAnalysisBar } from '../components/dashboard/SentimentAnalysisBar';
import { VocTopicTabs } from '../components/dashboard/VocTopicTabs';
import { NlpIntelligenceLayer } from '../components/dashboard/NlpIntelligenceLayer';
import { RootCauseAnalysisSection } from '../components/dashboard/RootCauseAnalysisSection';
import { FloatingAiChatbot } from '../components/dashboard/FloatingAiChatbot';
import { UploadDatasetModal } from '../components/dashboard/UploadDatasetModal';

export const ExecutiveOverviewView: React.FC = () => {
  const { activeRun, filters } = useApp();

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Date Range & Dataset Selector Slicers (Weekly, Monthly, Overall, Dataset Picker) */}
      <DateRangeSlicer />

      {/* 2. LLM-Generated Executive Directives & Voice-of-Customer Signal */}
      <ExecutiveSummaryCard />

      {/* 3. Live Dashboard of Operational KPIs: Avg Response Time, Resolution Rate, Escalation Rate, CSAT/Sentiment Trajectory */}
      <PrimaryKpiGrid />

      {/* 4. Strategic Service-Quality Gains Guided by Insights (Recurring Reduction, Sentiment Impact, Mean Latency, AI Boost) */}
      <StrategicPillars />

      {/* 5. Real-Time Anomaly & Friction Spike Detection (Rolling Z-Score Telemetry) */}
      <SpikeAlertsSection />

      {/* 6. Interaction Volume, Sentiment Stream & Latency Timeline Trends */}
      <VolumeTrendsChart />

      {/* 7. Sentiment Polarity Breakdown & Continuous Health Bar */}
      <SentimentAnalysisBar />

      {/* 8. Ranked Lists of Customer Issues: Recurring Pain Points, Emerging Issues, New Friction Themes & Prioritization */}
      <VocTopicTabs />

      {/* 9. Prioritized Actionable Recommendations for Product, Network, and Support Teams */}
      <NlpIntelligenceLayer />

      {/* 10. Systemic Root Cause Analysis (RCA) Deep-Dive */}
      <RootCauseAnalysisSection />

      {/* 11. Interactive Voice-of-Customer AI Copilot (Add-On) */}
      <FloatingAiChatbot />

      {/* Upload Dataset Modal */}
      <UploadDatasetModal />
    </div>
  );
};
