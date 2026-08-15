import React from 'react';
import { useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { ToastContainer } from './components/common/ToastContainer';
import { ExecutivePillars } from './components/overview/ExecutivePillars';
import { GenAISummaryCard } from './components/overview/GenAISummaryCard';
import { OperationalKpis } from './components/overview/OperationalKpis';
import { SentimentSpectrum } from './components/overview/SentimentSpectrum';
import { VolumeTrendsChart } from './components/charts/VolumeTrendsChart';
import { SentimentDonutChart } from './components/charts/SentimentDonutChart';
import { TopicBarChart } from './components/charts/TopicBarChart';
import { TopicHub } from './components/topics/TopicHub';
import { ChatPage } from './components/chatbot/ChatPage';
import { ChatDrawer } from './components/chatbot/ChatDrawer';
import { UploadDropzone } from './components/ingestion/UploadDropzone';
import { PipelineTracker } from './components/ingestion/PipelineTracker';
import { RunComparator } from './components/comparison/RunComparator';
import { RefreshCw, Filter, Sparkles, AlertCircle } from 'lucide-react';

export const MainDashboard: React.FC = () => {
  const { activeTab, refreshData, isLoading, data } = useApp();

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col font-sans selection:bg-primary-500 selection:text-white">
      {/* Top Application Navbar */}
      <Navbar />

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex w-full">
        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Dynamic Main Workspace Container */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-border/40">
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                {activeTab === 'overview' && 'Executive Performance & Strategic Directives'}
                {activeTab === 'analytics' && 'Multi-Dimensional Analytics & Spike Trends'}
                {activeTab === 'topics' && 'Voice-of-Customer Analytical Topics Hub'}
                {activeTab === 'chatbot' && 'Agentic AI Analytical Reasoning Workspace'}
                {activeTab === 'ingestion' && 'Dataset Ingestion & PostgreSQL Pipeline'}
                {activeTab === 'comparison' && 'Dataset Run Variance & Shift Comparator'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                AI-Powered Social Support Analytics &amp; Voice-of-Customer Intelligence
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refreshData}
                disabled={isLoading}
                className="btn-ghost text-xs py-1.5 px-3"
                title="Refresh Live Metrics"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Syncing...' : 'Sync Live'}</span>
              </button>
            </div>
          </div>

          {/* VIEW 1: EXECUTIVE OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* 4 Performance Pillars */}
              <ExecutivePillars />

              {/* GenAI Boss Directives */}
              <GenAISummaryCard />

              {/* 8 Operational KPIs */}
              <OperationalKpis />

              {/* Charts Row: Volume Trends & Donut */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2">
                  <VolumeTrendsChart />
                </div>
                <div>
                  <SentimentDonutChart />
                </div>
              </div>

              {/* Sentiment Spectrum */}
              <SentimentSpectrum />
            </div>
          )}

          {/* VIEW 2: DEEP ANALYTICS & TRENDS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <VolumeTrendsChart />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <TopicBarChart />
                <SentimentDonutChart />
              </div>

              <SentimentSpectrum />
              <OperationalKpis />
            </div>
          )}

          {/* VIEW 3: VOICE OF CUSTOMER TOPIC HUB */}
          {activeTab === 'topics' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <TopicHub />
            </div>
          )}

          {/* VIEW 4: AGENTIC AI CHATBOT WORKSPACE */}
          {activeTab === 'chatbot' && (
            <div className="animate-in fade-in duration-300">
              <ChatPage />
            </div>
          )}

          {/* VIEW 5: DATA INGESTION & PIPELINE */}
          {activeTab === 'ingestion' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <UploadDropzone />
              <PipelineTracker />
            </div>
          )}

          {/* VIEW 6: RUN COMPARATOR */}
          {activeTab === 'comparison' && (
            <div className="animate-in fade-in duration-300">
              <RunComparator />
            </div>
          )}
        </main>
      </div>

      {/* Floating Chat Drawer */}
      <ChatDrawer />

      {/* Toast Notification Container */}
      <ToastContainer />
    </div>
  );
};
