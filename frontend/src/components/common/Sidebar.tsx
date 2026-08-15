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
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'overview',
      label: 'Executive Overview',
      icon: <LayoutDashboard className="w-5 h-5" />,
      badge: '4 Pillars',
    },
    {
      id: 'analytics',
      label: 'Deep Analytics & Trends',
      icon: <TrendingUp className="w-5 h-5" />,
      badge: 'Spikes',
    },
    {
      id: 'topics',
      label: 'Voice of Customer Hub',
      icon: <MessageSquareText className="w-5 h-5" />,
      badge: '5 Tabs',
    },
    {
      id: 'chatbot',
      label: 'Agentic AI Copilot',
      icon: <Bot className="w-5 h-5" />,
      badge: 'Live AI',
    },
    {
      id: 'ingestion',
      label: 'Ingestion & Pipeline',
      icon: <UploadCloud className="w-5 h-5" />,
    },
    {
      id: 'comparison',
      label: 'Run Comparator',
      icon: <GitCompare className="w-5 h-5" />,
    },
  ];

  return (
    <aside
      className={`sticky top-[61px] h-[calc(100vh-61px)] bg-surface-200/95 backdrop-blur-xl border-r border-surface-border/70 flex flex-col justify-between transition-all duration-300 z-30 shrink-0 select-none ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Top Nav Items */}
      <div className="p-3 space-y-1.5 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {!collapsed && <span>Power BI Views</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-surface-50 transition"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-primary-600/30 to-indigo-600/10 text-white border border-primary-500/40 shadow-glow-primary'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-surface-100/70 border border-transparent'
              }`}
            >
              {/* Active Indicator Strip */}
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1 bg-primary-500 rounded-r-full shadow-glow-primary" />
              )}

              <div
                className={`transition-colors ${
                  isActive ? 'text-primary-400' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {item.icon}
              </div>

              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                          : 'bg-surface-50 text-slate-400 border border-surface-border'
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

      {/* Bottom Status Card */}
      {!collapsed && (
        <div className="p-3 m-3 rounded-xl bg-surface-100/60 border border-surface-border/60">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-slate-200">PostgreSQL Live Sync</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Sub-2ms cache signatures & grounded AI reasoning active.
          </p>
          <div className="mt-2 pt-2 border-t border-surface-border/40 flex items-center justify-between text-[10px] text-slate-400">
            <span>FastAPI v1.0.0</span>
            <span className="text-emerald-400 font-mono font-semibold">ONLINE</span>
          </div>
        </div>
      )}
    </aside>
  );
};
