import React from 'react';
import { useApp } from '../../context/AppContext';
import { RefreshCw, Sparkles, Download, Layers, Calendar, Database } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';

interface ViewHeaderProps {
  title: string;
  subtitle: string;
  category?: string;
  badge?: string;
  actions?: React.ReactNode;
}

export const ViewHeader: React.FC<ViewHeaderProps> = ({
  title,
  subtitle,
  category = 'Voila Intelligence',
  badge,
  actions,
}) => {
  const { isLoading, refreshData, activeRun, filters, addToast } = useApp();
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      addToast('Generating Report', 'Compiling executive PDF analytics report...', 'info');
      await api.downloadReportPdf(filters);
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.2 },
      });
      addToast('Report Ready', 'Executive intelligence report downloaded.', 'success');
    } catch (error) {
      console.error(error);
      addToast('Export Error', 'Failed to generate PDF report from server.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-surface-border/70">
      {/* Title & Metadata */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary-400 font-mono px-2 py-0.5 rounded bg-primary-500/10 border border-primary-500/20">
            {category}
          </span>
          {badge && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              {badge}
            </span>
          )}
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline flex items-center gap-1">
            • <Database className="w-3 h-3 text-cyan-400" /> Run:{' '}
            <strong className="text-slate-200">{activeRun?.run_id || 'run-w32-2026'}</strong>
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight">
          {title}
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          {subtitle}
        </p>
      </div>

      {/* Global Toolbar Actions */}
      <div className="flex items-center flex-wrap gap-2.5 shrink-0">
        {actions}

        <button
          onClick={handleExportPdf}
          disabled={isExporting}
          className="btn-ghost text-xs py-2 px-3"
          title="Export PDF Report"
        >
          <Download className={`w-3.5 h-3.5 text-indigo-400 ${isExporting ? 'animate-bounce' : ''}`} />
          <span className="hidden sm:inline">{isExporting ? 'Building...' : 'Export PDF'}</span>
        </button>

        <button
          onClick={refreshData}
          disabled={isLoading}
          className="btn-ghost text-xs py-2 px-3"
          title="Sync Real-Time Metrics"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Syncing...' : 'Sync Live'}</span>
        </button>
      </div>
    </div>
  );
};
