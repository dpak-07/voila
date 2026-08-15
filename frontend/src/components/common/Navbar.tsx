import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import confetti from 'canvas-confetti';
import {
  BarChart2,
  FileDown,
  Bot,
  RefreshCw,
  LogOut,
  User,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    filters,
    user,
    logout,
    isChatDrawerOpen,
    setIsChatDrawerOpen,
    setIsUploadModalOpen,
    addToast,
    refreshData,
    isLoading,
  } = useApp();

  const [isExporting, setIsExporting] = useState(false);

  const handleExportReport = async () => {
    try {
      setIsExporting(true);
      addToast('Generating Executive Report', 'Compiling multi-page analytics PDF report...', 'info');
      await api.downloadReportPdf(filters);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.2 },
      });
      addToast('PDF Report Ready', 'Executive intelligence report downloaded.', 'success');
    } catch (error) {
      console.error(error);
      addToast('Export Failed', 'Unable to compile PDF report from server.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 md:px-6 lg:px-8 py-3 shadow-xs w-full">
      <div className="w-full flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3 select-none">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                VOILA
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Intelligence
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Voice-of-Customer Analytics Dashboard
            </p>
          </div>
        </div>

        {/* Right Actions: Sync, Upload, PDF Export, AI Copilot, User Profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Sync */}
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="btn-secondary py-1.5 px-3 text-xs"
            title="Refresh Live Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{isLoading ? 'Syncing...' : 'Sync'}</span>
          </button>

          {/* Quick Upload */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="btn-secondary py-1.5 px-3 text-xs hidden sm:flex items-center gap-1.5"
            title="Upload New Dataset"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
            <span>Upload</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={handleExportReport}
            disabled={isExporting}
            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
            title="Download PDF Analytics Report"
          >
            <FileDown className={`w-3.5 h-3.5 text-slate-700 ${isExporting ? 'animate-bounce' : ''}`} />
            <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export PDF'}</span>
          </button>

          {/* AI Copilot */}
          <button
            onClick={() => setIsChatDrawerOpen(!isChatDrawerOpen)}
            className="btn-primary py-1.5 px-3.5 text-xs flex items-center gap-1.5"
            title="Open Voila AI Assistant"
          >
            <Bot className="w-4 h-4" />
            <span>AI Copilot</span>
          </button>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden lg:block text-right">
                <p className="text-xs font-bold text-slate-900 leading-tight">{user.username}</p>
                <p className="text-[10px] text-slate-500 font-mono leading-tight">{user.email}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200 shadow-2xs">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
