import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ViewHeader } from '../components/common/ViewHeader';
import { VolumeTrendsChart } from '../components/charts/VolumeTrendsChart';
import { SentimentDonutChart } from '../components/charts/SentimentDonutChart';
import { TopicBarChart } from '../components/charts/TopicBarChart';
import { SentimentSpectrum } from '../components/overview/SentimentSpectrum';
import { OperationalKpis } from '../components/overview/OperationalKpis';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  AlertTriangle,
  Layers,
  BarChart2,
  PieChart,
  Activity,
  Calendar,
  Filter,
} from 'lucide-react';

export const DeepAnalyticsView: React.FC = () => {
  const { data, filters, setCadence } = useApp();
  const spikes = data?.trends?.spikes || [
    { date: '2026-08-13', z_score: 3.2, topic: 'Android 14 App Release Crash Surge' },
    { date: '2026-08-01', z_score: 2.8, topic: 'Payment Gateway Provider Timeout' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <ViewHeader
        category="Multi-Dimensional Analytics"
        badge="Z-Score Spikes & Polarity"
        title="Multi-Dimensional Analytics & Spike Trends"
        subtitle="Explore continuous conversation volume streams, statistically anomalous spikes (Z > 2.5), sentiment distribution, and SLA resolution times."
      />

      {/* Main Multi-Series Volume Trends Canvas */}
      <VolumeTrendsChart />

      {/* 2-Column Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <TopicBarChart />
        <SentimentDonutChart />
      </div>

      {/* Z-Score Spike Anomaly Telemetry Table */}
      <div className="executive-card space-y-4">
        <div className="executive-card-header">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Statistical Spike Anomaly Telemetry (Z-Score &gt; 2.5)</h3>
              <p className="text-xs text-slate-400">Automated outlier detection flagging volume surges exceeding 2.5 standard deviations</p>
            </div>
          </div>
          <span className="badge-rose">2 Anomaly Events Detected</span>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Anomaly Timestamp</th>
                <th>Z-Score Outlier Index</th>
                <th>Spike Driver Topic Cluster</th>
                <th>Severity Level</th>
                <th>Root Cause Status</th>
              </tr>
            </thead>
            <tbody>
              {spikes.map((spk, idx) => (
                <tr key={idx}>
                  <td className="font-mono text-xs font-bold text-white">
                    {spk.date}
                  </td>
                  <td>
                    <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 text-xs">
                      Z = {spk.z_score}σ
                    </span>
                  </td>
                  <td className="font-bold text-slate-200">
                    {spk.topic}
                  </td>
                  <td>
                    <span className="badge-rose">Critical Surge</span>
                  </td>
                  <td>
                    <span className="text-xs font-semibold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                      Engineering Hotfix Applied
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sentiment Spectrum & Operational KPIs */}
      <SentimentSpectrum />
      <OperationalKpis />
    </motion.div>
  );
};
