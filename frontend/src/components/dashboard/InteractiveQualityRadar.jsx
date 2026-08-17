import React, { useState } from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';
import { Compass, ShieldCheck, Award, Info, Eye } from 'lucide-react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';
import { useTheme } from '../../context/ThemeContext';

export function InteractiveQualityRadar({ kpis = {}, pillars = {} }) {
  const [showBenchmark, setShowBenchmark] = useState(true);
  const { isDark } = useTheme();

  // Normalize metrics into 0-100 scale
  const fcrScore = Math.min(100, Math.max(0, Math.round(kpis.resolution_rate || 0)));
  const slaScore = Math.min(100, Math.max(0, Math.round(100 - Math.min(100, (kpis.avg_response_time_minutes || 60) / 1.8))));
  const escControl = Math.min(100, Math.max(0, Math.round(100 - (kpis.escalation_rate || 0) * 10)));
  const reopenControl = Math.min(100, Math.max(0, Math.round(100 - (kpis.reopen_rate || 0))));
  const sentimentHealth = Math.min(100, Math.max(0, Math.round(100 - (kpis.negative_sentiment_percentage || 0) * 2)));
  const velocityScore = Math.min(100, Math.max(0, Math.round(pillars.ai_speedup_boost || 0)));

  const radarData = [
    { subject: 'First-Contact Resolution', current: fcrScore, benchmark: 75, fullMark: 100 },
    { subject: 'SLA Velocity & Speed', current: slaScore, benchmark: 80, fullMark: 100 },
    { subject: 'Escalation Suppression', current: escControl, benchmark: 85, fullMark: 100 },
    { subject: 'Reopen Prevention', current: reopenControl, benchmark: 70, fullMark: 100 },
    { subject: 'Sentiment Health Index', current: sentimentHealth, benchmark: 78, fullMark: 100 },
    { subject: 'Process Automation', current: velocityScore, benchmark: 65, fullMark: 100 },
  ];

  const overallHealthScore = Math.round(
    (fcrScore + slaScore + escControl + reopenControl + sentimentHealth + velocityScore) / 6
  );

  return (
    <div className="p-6 rounded-2xl glass-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-xs">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Operational Service Quality Radar</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 text-[10px] font-mono font-bold border border-slate-200 dark:border-white/10">
                Score: {overallHealthScore}/100
              </span>
            </h3>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Multi-axial performance evaluation across 6 core service delivery dimensions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBenchmark(!showBenchmark)}
            className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold transition-all border cursor-pointer ${
              showBenchmark 
                ? 'bg-slate-900 dark:bg-indigo-600 text-white border-transparent shadow-xs' 
                : 'bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-200'
            }`}
          >
            {showBenchmark ? 'Hide Industry Baseline' : 'Show Industry Baseline'}
          </button>
          <ConfidenceBadge confidence="measured" size="sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        {/* Radar Chart Display */}
        <div className="lg:col-span-2 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke={isDark ? '#334155' : '#cbd5e1'} />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11, fontWeight: 600 }} 
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke={isDark ? '#475569' : '#94a3b8'} fontSize={10} />
              <Radar
                name="Current Performance"
                dataKey="current"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.4}
              />
              {showBenchmark && (
                <Radar
                  name="Industry Benchmark (Top 10%)"
                  dataKey="benchmark"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.2}
                />
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: isDark ? '#1e293b' : '#e2e8f0',
                  borderRadius: '0.75rem',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: isDark ? '#ffffff' : '#0f172a',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Dimension Breakdown Metrics Cards */}
        <div className="space-y-2">
          {radarData.map((d, i) => {
            const isAhead = d.current >= d.benchmark;
            return (
              <div
                key={i}
                className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs font-mono shadow-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-semibold truncate">{d.subject}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-slate-900 dark:text-white">{d.current}/100</span>
                  {showBenchmark && (
                    <span className={`text-[10px] font-bold ${isAhead ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      ({isAhead ? `+${d.current - d.benchmark}` : `${d.current - d.benchmark}`})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default InteractiveQualityRadar;
