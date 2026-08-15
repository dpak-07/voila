import React, { useState } from 'react';
import { useApp, NavTab } from '../../context/AppContext';
import {
  LayoutDashboard,
  TrendingUp,
  MessageSquareText,
  Bot,
  UploadCloud,
  GitCompare,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Sparkles,
  PieChart,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, activeRun } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  const navCategories: {
    title: string;
    items: { id: NavTab; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }[];
  }[] = [
    {
      title: 'Executive Suite',
      items: [
        {
          id: 'overview',
          label: 'Executive Overview',
          icon: <LayoutDashboard className="w-4 h-4" />,
          badge: '4 Pillars',
          badgeColor: 'bg-primary-500/20 text-primary-300 border-primary-500/30',
        },
        {
          id: 'analytics',
          label: 'Deep Analytics & Spikes',
          icon: <TrendingUp className="w-4 h-4" />,
          badge: 'Z-Scores',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        },
      ],
    },
    {
      title: 'Customer Voice & Topics',
      items: [
        {
          id: 'topics',
          label: 'Voice-of-Customer Hub',
          icon: <MessageSquareText className="w-4 h-4" />,
          badge: '5 Tabs',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        },
        {
          id: 'chatbot',
          label: 'Agentic AI Workspace',
          icon: <Bot className="w-4 h-4" />,
          badge: 'Grounded',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        },
      ],
    },
    {
      title: 'Data Operations',
      items: [
        {
          id: 'ingestion',
          label: 'Ingestion & Pipeline',
          icon: <UploadCloud className="w-4 h-4" />,
          badge: 'Live',
          badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
        },
        {
          id: 'comparison',
          label: 'Run Shift Comparator',
          icon: <GitCompare className="w-4 h-4" />,
          badge: 'Delta',
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        },
      ],
    },
  ];

  return (
    <aside
      className={`sticky top-[57px] h-[calc(100vh-57px)] bg-obsidian-900/95 backdrop-blur-2xl border-r border-surface-border flex flex-col justify-between transition-all duration-300 z-30 shrink-0 select-none ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Top Nav Items Container */}
      <div className="p-3 space-y-4 overflow-y-auto">
        {/* Header with collapse toggle */}
        <div className="flex items-center justify-between px-2 pt-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 font-mono">
          {!collapsed && <span>Intelligence Views</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-100 transition"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Categorized Nav Items */}
        {navCategories.map((cat, cIdx) => (
          <div key={cIdx} className="space-y-1">
            {!collapsed && (
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                {cat.title}
              </div>
            )}

            {cat.items.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-600/30 to-indigo-600/10 text-white border border-primary-500/40 shadow-glow-primary'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-surface-100/70 border border-transparent'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  {/* Active Indicator Bar */}
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-cyan-400 to-primary-500 rounded-r-full shadow-glow-primary" />
                  )}

                  <div
                    className={`transition-colors shrink-0 ${
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {item.icon}
                  </div>

                  {!collapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                            isActive
                              ? item.badgeColor
                              : 'bg-surface-100 text-slate-400 border-surface-border'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Status Card */}
      {!collapsed && (
        <div className="p-3 m-3 rounded-2xl bg-obsidian-850 border border-surface-border/70 shadow-inner space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-bold text-slate-200">PostgreSQL Store</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              HEALTHY
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Sub-2ms pre-aggregated signatures active for run <span className="font-mono text-cyan-300">{activeRun?.run_id || 'run-w32-2026'}</span>.
          </p>
          <div className="pt-2 border-t border-surface-border/50 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>FastAPI v1.0.0</span>
            <span className="text-cyan-400 font-bold">14,850 rows</span>
          </div>
        </div>
      )}
    </aside>
  );
};
