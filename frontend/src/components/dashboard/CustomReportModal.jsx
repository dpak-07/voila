import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileDown, 
  Sparkles, 
  Calendar, 
  Layers, 
  BarChart3, 
  ShieldCheck, 
  Clock, 
  Check, 
  X, 
  FileText, 
  Table as TableIcon, 
  Code, 
  Copy, 
  CheckCircle2, 
  SlidersHorizontal, 
  Eye, 
  Flame, 
  Wrench, 
  Globe,
  GitCompare,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { useRun } from '../../context/RunContext';
import { analyticsApi } from '../../api/analytics';

export function CustomReportModal({ isOpen, onClose }) {
  const { runs, activeRunId, filters } = useRun();

  // State: Report Type & Granularity
  const [reportType, setReportType] = useState('operational'); // 'executive', 'operational', 'comparative', 'rca_playbook'
  const [timePeriod, setTimePeriod] = useState(filters.time_period || 'overall');
  const [selectedYear, setSelectedYear] = useState(filters.year || '');
  const [baselineRunId, setBaselineRunId] = useState(runs.length > 1 ? runs[1].run_id : '');
  const [exportFormat, setExportFormat] = useState('pdf'); // 'pdf', 'markdown', 'csv', 'json'
  
  // State: Section Checkboxes
  const [selectedSections, setSelectedSections] = useState({
    summary: true,
    kpi_summary: true,
    spikes: true,
    topics: true,
    root_causes: true,
    recommendations: true,
    dimensions: true,
  });

  // State: Preview & Downloading
  const [activeTab, setActiveTab] = useState('config'); // 'config' or 'preview'
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const toggleSection = (sec) => {
    setSelectedSections((prev) => ({
      ...prev,
      [sec]: !prev[sec],
    }));
  };

  const getActiveSectionsList = () => {
    return Object.keys(selectedSections).filter((k) => selectedSections[k]).join(',');
  };

  const fetchLivePreview = async () => {
    setIsLoadingPreview(true);
    try {
      const res = await analyticsApi.previewReport({
        report_type: reportType,
        time_period: timePeriod,
        year: selectedYear || undefined,
        sections: getActiveSectionsList(),
        run_id: activeRunId === 'all' ? undefined : activeRunId,
        baseline_run_id: reportType === 'comparative' ? baselineRunId : undefined,
        company: filters.company || undefined,
        product: filters.product || undefined,
        region: filters.region || undefined,
      });
      setPreviewData(res);
    } catch (err) {
      console.error('[Preview error]:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'preview') {
      fetchLivePreview();
    }
  }, [isOpen, activeTab, reportType, timePeriod, selectedYear, baselineRunId]);

  const handleExport = async (formatOverride) => {
    const format = formatOverride || exportFormat;
    try {
      setIsExporting(true);
      await analyticsApi.downloadReport({
        report_type: reportType,
        time_period: timePeriod,
        year: selectedYear || undefined,
        format: format,
        sections: getActiveSectionsList(),
        run_id: activeRunId === 'all' ? undefined : activeRunId,
        baseline_run_id: reportType === 'comparative' ? baselineRunId : undefined,
        company: filters.company || undefined,
        product: filters.product || undefined,
        region: filters.region || undefined,
      });
    } catch (err) {
      console.error('[Export error]:', err);
      alert('Failed to generate customized report.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (previewData?.markdown) {
      navigator.clipboard.writeText(previewData.markdown);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
                <span>Enterprise Custom Report Studio</span>
                <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                  v2.4
                </span>
              </h3>
              <p className="text-xs font-mono text-slate-500">
                Tailor monthly, weekly, yearly, and comparative dataset delta reports across multiple formats
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex items-center rounded-xl bg-slate-200/70 p-1 font-mono text-xs">
              <button
                onClick={() => setActiveTab('config')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTab === 'config' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Customize</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('preview');
                  fetchLivePreview();
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTab === 'preview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'config' ? (
            <div className="space-y-6">
              {/* Step 1: Report Archetype & Scope */}
              <div className="space-y-3">
                <label className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>1. Choose Report Objective & Type</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { id: 'executive', title: 'Executive Briefing', desc: 'High-level synthesis, KPI cards, and strategic leadership priorities.', icon: Sparkles },
                    { id: 'operational', title: 'Operational Audit', desc: 'Full SLA distribution, c-TF-IDF topic clusters, and regional matrices.', icon: BarChart3 },
                    { id: 'comparative', title: 'Comparative Trends', desc: 'Multi-period variance waterfall, delta shifts, and period benchmarks.', icon: GitCompare },
                    { id: 'rca_playbook', title: 'Root Cause Playbook', desc: 'Deep systemic failure mechanisms and engineering fix roadmaps.', icon: Wrench },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = reportType === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setReportType(t.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-sm text-slate-900">{t.title}</h4>
                          <p className="text-[11px] text-slate-500 leading-snug mt-1">{t.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Time Horizon & Granularity */}
              <div className="space-y-3">
                <label className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>2. Time Horizon & Trend Granularity</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
                  {[
                    { id: 'overall', label: 'All-Time Total' },
                    { id: 'monthly', label: 'Monthly Trends' },
                    { id: 'weekly', label: 'Weekly Velocity' },
                    { id: 'daily', label: 'Daily SLA Window' },
                    { id: 'yearly', label: 'Year-by-Year' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setTimePeriod(p.id)}
                      className={`p-3 rounded-xl border text-center font-bold transition-all ${
                        timePeriod === p.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Additional Period Controls */}
                {timePeriod === 'yearly' && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-mono font-bold text-slate-700">Target Year:</span>
                    {['2024', '2025', '2026'].map((yr) => (
                      <button
                        key={yr}
                        onClick={() => setSelectedYear(yr)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border transition-all ${
                          selectedYear === yr ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                )}

                {reportType === 'comparative' && runs.length > 1 && (
                  <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2 font-mono text-xs">
                    <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <GitCompare className="w-4 h-4 text-indigo-600" />
                      <span>Select Baseline Dataset Run for Delta Comparison:</span>
                    </span>
                    <select
                      value={baselineRunId}
                      onChange={(e) => setBaselineRunId(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 outline-none font-bold"
                    >
                      {runs.map((r, idx) => (
                        <option key={r.run_id} value={r.run_id}>
                          Baseline Run #{idx + 1} · {r.run_id.slice(0, 8)} ({Number(r.total_records || 0).toLocaleString()} rows)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Step 3: Modular Section Builder */}
              <div className="space-y-3">
                <label className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  <span>3. Modular Section Checkboxes</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 font-mono text-xs">
                  {[
                    { id: 'summary', label: 'Executive AI Briefing Narrative', icon: Sparkles },
                    { id: 'kpi_summary', label: 'Core SLA & Resolution KPIs', icon: BarChart3 },
                    { id: 'spikes', label: 'Z-Score Spike Anomalies & Velocity', icon: Flame },
                    { id: 'topics', label: 'BERTopic c-TF-IDF Clusters', icon: Layers },
                    { id: 'root_causes', label: 'Root Cause (RCA) Engineering Fixes', icon: Wrench },
                    { id: 'dimensions', label: 'Cross-Regional & Market Slicing', icon: Globe },
                  ].map((sec) => {
                    const Icon = sec.icon;
                    const isChecked = selectedSections[sec.id];
                    return (
                      <div
                        key={sec.id}
                        onClick={() => toggleSection(sec.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${isChecked ? 'text-indigo-400' : 'text-slate-500'}`} />
                          <span className="font-bold">{sec.label}</span>
                        </div>
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                          isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: Live Markdown / Entity Preview */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-mono font-bold text-slate-900">
                  Live Generated Report Preview ({reportType.toUpperCase()} · {timePeriod.toUpperCase()})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchLivePreview}
                    disabled={isLoadingPreview}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPreview ? 'animate-spin' : ''}`} />
                    <span>Refresh Preview</span>
                  </button>
                  <button
                    onClick={handleCopyMarkdown}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-mono font-bold transition-colors"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied Markdown!' : 'Copy Markdown'}</span>
                  </button>
                </div>
              </div>

              {isLoadingPreview ? (
                <div className="p-12 text-center font-mono text-xs text-slate-500 space-y-3">
                  <RefreshCw className="w-6 h-6 mx-auto animate-spin text-indigo-600" />
                  <p>Synthesizing publication-grade report with ground-truth database telemetry...</p>
                </div>
              ) : previewData?.markdown ? (
                <div className="p-5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed max-h-[450px] overflow-y-auto space-y-4 border border-slate-800 shadow-inner">
                  <pre className="whitespace-pre-wrap font-mono text-xs text-slate-200">
                    {previewData.markdown}
                  </pre>
                </div>
              ) : (
                <div className="p-8 text-center text-xs font-mono text-slate-500">
                  No preview generated yet. Click "Refresh Preview" to generate.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer: Multi-Format Download Buttons */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Format: <strong>{exportFormat.toUpperCase()}</strong> | Enterprise Ready</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              <span>Download Executive PDF</span>
            </button>

            <button
              onClick={() => handleExport('markdown')}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-mono text-xs font-bold shadow-2xs transition-all disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>Markdown (.md)</span>
            </button>

            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-mono text-xs font-bold shadow-2xs transition-all disabled:opacity-50"
            >
              <TableIcon className="w-4 h-4" />
              <span>CSV Data (.csv)</span>
            </button>

            <button
              onClick={() => handleExport('json')}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-mono text-xs font-bold shadow-2xs transition-all disabled:opacity-50"
            >
              <Code className="w-4 h-4" />
              <span>JSON (.json)</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

export default CustomReportModal;
