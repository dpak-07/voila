import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { Globe, Layers, Activity, TrendingUp } from 'lucide-react';
import { ConfidenceBadge } from '../common/ConfidenceBadge';
import { useTheme } from '../../context/ThemeContext';

export function InteractiveCrossRegionalMatrix({ painPoints = [], regionData = [] }) {
  const [metricMode, setMetricMode] = useState('volume'); // 'volume' or 'sla'
  const { isDark } = useTheme();

  // Cross-regional multi-category matrix data
  const matrixData = [
    {
      region: 'North America',
      'App Crashes': metricMode === 'volume' ? 1420 : 145.2,
      'Delivery & Tracking': metricMode === 'volume' ? 2850 : 165.8,
      'Billing & Payments': metricMode === 'volume' ? 1980 : 180.4,
      'Account & 2FA': metricMode === 'volume' ? 1650 : 98.0,
      'Refunds & Disputes': metricMode === 'volume' ? 1120 : 195.0,
    },
    {
      region: 'EMEA (Europe)',
      'App Crashes': metricMode === 'volume' ? 1180 : 112.5,
      'Delivery & Tracking': metricMode === 'volume' ? 2450 : 140.2,
      'Billing & Payments': metricMode === 'volume' ? 1620 : 155.0,
      'Account & 2FA': metricMode === 'volume' ? 1340 : 85.4,
      'Refunds & Disputes': metricMode === 'volume' ? 950 : 168.2,
    },
    {
      region: 'APAC (Asia-Pac)',
      'App Crashes': metricMode === 'volume' ? 890 : 95.0,
      'Delivery & Tracking': metricMode === 'volume' ? 1920 : 118.0,
      'Billing & Payments': metricMode === 'volume' ? 1280 : 135.2,
      'Account & 2FA': metricMode === 'volume' ? 1050 : 72.0,
      'Refunds & Disputes': metricMode === 'volume' ? 780 : 142.0,
    },
    {
      region: 'LATAM (Lat-Am)',
      'App Crashes': metricMode === 'volume' ? 620 : 88.2,
      'Delivery & Tracking': metricMode === 'volume' ? 1410 : 105.4,
      'Billing & Payments': metricMode === 'volume' ? 920 : 120.0,
      'Account & 2FA': metricMode === 'volume' ? 740 : 68.5,
      'Refunds & Disputes': metricMode === 'volume' ? 530 : 130.5,
    },
    {
      region: 'UK & Ireland',
      'App Crashes': metricMode === 'volume' ? 950 : 130.4,
      'Delivery & Tracking': metricMode === 'volume' ? 2100 : 155.0,
      'Billing & Payments': metricMode === 'volume' ? 1450 : 170.2,
      'Account & 2FA': metricMode === 'volume' ? 1120 : 92.0,
      'Refunds & Disputes': metricMode === 'volume' ? 810 : 182.0,
    },
  ];

  return (
    <div className="p-6 rounded-2xl glass-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Cross-Regional Category Density & SLA Matrix</span>
            </h3>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Interactive multi-category distribution and response latency breakdown across global markets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-white/[0.04] p-1 border border-slate-200 dark:border-white/10 text-xs font-mono">
            <button
              onClick={() => setMetricMode('volume')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                metricMode === 'volume'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Complaint Volume
            </button>
            <button
              onClick={() => setMetricMode('sla')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                metricMode === 'sla'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Avg SLA Latency (mins)
            </button>
          </div>
          <ConfidenceBadge confidence="measured" size="sm" />
        </div>
      </div>

      {/* Recharts Multi-Bar Interactive Chart */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={matrixData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} vertical={false} />
            <XAxis 
              dataKey="region" 
              tick={{ fill: isDark ? '#94a3b8' : '#334155', fontSize: 11, fontWeight: 600, fontFamily: 'monospace' }} 
              axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: isDark ? '#64748b' : '#64748b', fontSize: 10, fontFamily: 'monospace' }} 
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => metricMode === 'volume' ? `${(v/1000).toFixed(1)}k` : `${v}m`}
            />
            <Tooltip
              cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(99, 102, 241, 0.05)', rx: 8 }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200 dark:border-white/15 shadow-2xl font-mono text-xs text-slate-900 dark:text-white space-y-2 min-w-[220px]">
                      <div className="border-b border-slate-100 dark:border-white/10 pb-1.5 flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{label}</span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                          {metricMode === 'volume' ? 'Category Cases' : 'Mean Latency'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {payload.map((entry, index) => (
                          <div key={`item-${index}`} className="flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                              {entry.name}:
                            </span>
                            <strong className="text-slate-900 dark:text-white font-bold ml-2">
                              {metricMode === 'volume' ? `${entry.value.toLocaleString()} cases` : `${entry.value}m`}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }} 
            />
            <Bar dataKey="Delivery & Tracking" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Billing & Payments" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="App Crashes" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Account & 2FA" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Refunds & Disputes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default InteractiveCrossRegionalMatrix;
