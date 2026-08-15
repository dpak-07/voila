import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TimePeriod } from '../../types';
import { api } from '../../services/api';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Bot,
  FileDown,
  Database,
  Calendar,
  Search,
  User,
  ChevronDown,
  Layers,
  Activity,
  Check
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    filters,
    setCadence,
    setRunId,
    runs,
    activeRun,
    isChatDrawerOpen,
    setIsChatDrawerOpen,
    addToast,
    user,
    setActiveTab,
  } = useApp();

  const [isRunDropdownOpen, setIsRunDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportReport = async () => {
    try {
      setIsExporting(true);
      addToast('Generating Report', 'Building executive PDF analytics report...', 'info');
      await api.downloadReportPdf(filters);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.2 },
      });
      addToast('Report Ready', 'Voila Analytics PDF report generated and downloaded.', 'success');
    } catch (error) {
      console.error(error);
      addToast('Export Error', 'Failed to generate PDF report from server.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const cadenceOptions: { label: string; value: TimePeriod; icon: string }[] = [
    { label: 'Daily', value: 'daily', icon: '📅' },
    { label: 'Weekly', value: 'weekly', icon: '📊' },
    { label: 'Monthly', value: 'monthly', icon: '📈' },
    { label: 'Overall', value: 'overall', icon: '🌐' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-surface-300/80 backdrop-blur-xl border-b border-surface-border/70 px-4 lg:px-6 py-3 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Voila Brand Logo & Active Dataset Pill */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-primary-500 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
              <div className="w-full h-full bg-surface-card rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400 group-hover:text-white transition-colors animate-pulse-subtle" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">
                  VOILA
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-300 border border-primary-500/30">
                  AI Hub
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Voice-of-Customer Intelligence
              </p>
            </div>
          </div>

          {/* Dataset Run Slicer Selector */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setIsRunDropdownOpen(!isRunDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-100/90 border border-surface-border text-xs font-medium text-slate-200 hover:text-white hover:border-slate-600 transition"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="max-w-[140px] truncate">
                {activeRun?.dataset_name || activeRun?.filename || 'Latest Dataset'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isRunDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-surface-card/95 backdrop-blur-xl border border-surface-border rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-surface-border/50">
                  Select Dataset Run
                </div>
                <div className="max-h-60 overflow-y-auto py-1 space-y-1">
                  {runs.map((r) => {
                    const isSelected = (filters.runId === r.run_id) || (!filters.runId && r === runs[0]);
                    return (
                      <button
                        key={r.run_id}
                        onClick={() => {
                          setRunId(r.run_id);
                          setIsRunDropdownOpen(false);
                          addToast('Dataset Loaded', `Active dataset set to ${r.dataset_name || r.run_id}`, 'info');
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition ${
                          isSelected
                            ? 'bg-primary-500/15 text-primary-300 border border-primary-500/30'
                            : 'text-slate-300 hover:bg-surface-50 hover:text-white'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold truncate">{r.dataset_name || r.filename || r.run_id}</p>
                          <p className="text-[10px] text-slate-400">
                            {r.total_rows ? `${r.total_rows.toLocaleString()} rows` : ''} • {r.timestamp || 'Recent'}
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="p-1 border-t border-surface-border/50">
                  <button
                    onClick={() => {
                      setIsRunDropdownOpen(false);
                      setActiveTab('ingestion');
                    }}
                    className="w-full py-1.5 text-center text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-md transition"
                  >
                    + Upload New Dataset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Power-BI Cadence Filter Slicers */}
        <div className="flex items-center bg-surface-card/90 p-1 rounded-xl border border-surface-border/70 shadow-inner">
          {cadenceOptions.map((opt) => {
            const isActive = filters.timePeriod === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setCadence(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-50/50'
                }`}
              >
                <span>{opt.icon}</span>
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Actions & User Info */}
        <div className="flex items-center gap-2.5">
          {/* Export PDF Button */}
          <button
            onClick={handleExportReport}
            disabled={isExporting}
            className="btn-ghost hidden sm:inline-flex"
            title="Download PDF Executive Analytics Report"
          >
            <FileDown className={`w-4 h-4 text-indigo-400 ${isExporting ? 'animate-bounce' : ''}`} />
            <span className="text-xs font-semibold">{isExporting ? 'Building...' : 'Export Report'}</span>
          </button>

          {/* AI Copilot Drawer Button */}
          <button
            onClick={() => setIsChatDrawerOpen(!isChatDrawerOpen)}
            className="relative p-2 rounded-lg bg-gradient-to-r from-primary-500/20 to-cyan-500/20 hover:from-primary-500/30 hover:to-cyan-500/30 border border-primary-500/30 text-primary-300 hover:text-white transition shadow-sm"
            title="Voila AI Co-pilot Chat"
          >
            <Bot className="w-5 h-5 text-cyan-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-surface-300 animate-pulse" />
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-surface-border/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
              {user.username.charAt(0)}
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <p className="text-xs font-semibold text-slate-200">{user.username}</p>
              <p className="text-[10px] text-emerald-400 font-medium">Online • {user.role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
