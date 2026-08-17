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
  RefreshCw,
  Cpu
} from 'lucide-react';
import { useRun } from '../../context/RunContext';
import { analyticsApi } from '../../api/analytics';

export function CustomReportModal({ isOpen, onClose }) {
  const { runs, activeRunId, filters, dateRangeInfo } = useRun();

  // State: Report Type & Granularity
  const [reportType, setReportType] = useState('master'); // 'master', 'executive', 'operational', 'comparative', 'rca_playbook'
  const [timePeriod, setTimePeriod] = useState(filters.time_period || 'overall');
  const [selectedYear, setSelectedYear] = useState(filters.year || '');
  const [selectedMonth, setSelectedMonth] = useState(filters.month || '');
  const [baselineRunId, setBaselineRunId] = useState(runs.length > 1 ? runs[1].run_id : '');
  const [exportFormat, setExportFormat] = useState('pdf'); // 'pdf', 'markdown', 'csv', 'json'
  
  // State: Deep Analytical Section Checkboxes
  const [selectedSections, setSelectedSections] = useState({
    summary: true,
    kpi_summary: true,
    sentiment: true,
    sla: true,
    spikes: true,
    topics: true,
    root_causes: true,
    trends: true,
    recommendations: true,
    dimensions: true,
    methodology: true,
  });

  // State: Preview & Downloading
  const [activeTab, setActiveTab] = useState('config'); // 'config' or 'preview'
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const months = [
    { num: 1, name: 'Jan' }, { num: 2, name: 'Feb' }, { num: 3, name: 'Mar' },
    { num: 4, name: 'Apr' }, { num: 5, name: 'May' }, { num: 6, name: 'Jun' },
    { num: 7, name: 'Jul' }, { num: 8, name: 'Aug' }, { num: 9, name: 'Sep' },
    { num: 10, name: 'Oct' }, { num: 11, name: 'Nov' }, { num: 12, name: 'Dec' }
  ];

  const toggleSection = (sec) => {
    setSelectedSections((prev) => ({
      ...prev,
      [sec]: !prev[sec],
    }));
  };

  const selectAllSections = (val) => {
    setSelectedSections({
      summary: val,
      kpi_summary: val,
      sentiment: val,
      sla: val,
      spikes: val,
      topics: val,
      root_causes: val,
      trends: val,
      recommendations: val,
      dimensions: val,
      methodology: val,
    });
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
        month: selectedMonth || undefined,
        sections: getActiveSectionsList(),
        run_id: activeRunId === 'all' ? undefined : activeRunId,
        baseline_run_id: (reportType === 'comparative' || reportType === 'master') ? baselineRunId : undefined,
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
  }, [isOpen, activeTab, reportType, timePeriod, selectedYear, selectedMonth, baselineRunId]);

  const handleExport = async (formatOverride) => {
    const format = formatOverride || exportFormat;
    try {
      setIsExporting(true);
      await analyticsApi.downloadReport({
        report_type: reportType,
        time_period: timePeriod,
        year: selectedYear || undefined,
        month: selectedMonth || undefined,
        format: format,
        sections: getActiveSectionsList(),
        run_id: activeRunId === 'all' ? undefined : activeRunId,
        baseline_run_id: (reportType === 'comparative' || reportType === 'master') ? baselineRunId : undefined,
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

  const handleCopyMarkdown = async () => {
    if (previewData?.markdown) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(previewData.markdown);
        } else {
          const ta = document.createElement('textarea');
          ta.value = previewData.markdown;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('[Copy failed]:', err);
      }
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
                  v2.5 Deep Analytics
                </span>
              </h3>
              <p className="text-xs font-mono text-slate-500">
                Tailor Master, Weekly, Monthly, Regional, and Comparative reports across PDF, Markdown, CSV, and JSON
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
                  <span>1. Choose Report Archetype & Scope</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {[
                    { id: 'master', title: 'Master Report (All-in-One)', desc: 'Unified full audit: Executive, Operational, Regional Map, Period Variance, & RCA.', icon: Cpu, badge: 'Recommended' },
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
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {t.badge && (
                            <span className="text-[9px] font-mono font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                              {t.badge}
                            </span>
                          )}
                          {isSelected && !t.badge && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-xs text-slate-900 leading-snug">{t.title}</h4>
                          <p className="text-[10px] text-slate-500 leading-snug mt-1">{t.desc}</p>
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
                  <span>2. Time Horizon & Dynamic Date Slicing</span>
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

                {/* Granular Year / Month Selectors for Weekly & Daily Horizons */}
                {(timePeriod === 'weekly' || timePeriod === 'daily' || timePeriod === 'monthly' || timePeriod === 'yearly') && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 font-mono text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Year Selector */}
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 uppercase text-[11px]">Calendar Year:</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setSelectedYear('')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                              !selectedYear ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            All Years
                          </button>
                          {(dateRangeInfo?.available_years?.length ? dateRangeInfo.available_years : [2024, 2025, 2026]).map((yr) => (
                            <button
                              key={yr}
                              onClick={() => setSelectedYear(String(yr))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                String(selectedYear) === String(yr) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'
                              }`}
                            >
                              {yr}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Month Selector for Weekly and Daily */}
                      {(timePeriod === 'weekly' || timePeriod === 'daily') && (
                        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                          <span className="font-bold text-slate-700 uppercase text-[11px]">Month:</span>
                          <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 font-bold outline-none cursor-pointer text-xs"
                          >
                            <option value="">All Months</option>
                            {months.map((m) => (
                              <option key={m.num} value={m.num}>
                                {m.name} (Month {m.num})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(reportType === 'comparative' || reportType === 'master') && runs.length > 1 && (
                  <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2 font-mono text-xs">
                    <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <GitCompare className="w-4 h-4 text-indigo-600" />
                      <span>Select Baseline Dataset Run for Delta & Causal Comparison:</span>
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

              {/* Step 3: Granular Analytical Report Sections */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>3. Granular Deep Analytical Sections</span>
                  </label>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <button 
                      onClick={() => selectAllSections(true)}
                      className="text-indigo-600 hover:underline font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">·</span>
                    <button 
                      onClick={() => selectAllSections(false)}
                      className="text-slate-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 font-mono text-xs">
                  {[
                    { id: 'summary', label: 'Executive Summary', desc: 'High-level narrative briefing with key findings' },
                    { id: 'kpi_summary', label: 'KPI Dashboard with Benchmarks', desc: 'All 7 core metrics with target comparisons and explanations' },
                    { id: 'sentiment', label: 'Customer Sentiment Analysis', desc: 'Negative, positive, neutral distribution with interpretations' },
                    { id: 'sla', label: 'Response Time & SLA Performance', desc: '4-tier SLA breakdown from <15m to >4h with breach analysis' },
                    { id: 'topics', label: 'Complaint Topic Clusters', desc: 'Ranked NLP clusters with volume share, sentiment and insights' },
                    { id: 'root_causes', label: 'Root Cause Analysis (RCA)', desc: 'Failure domains with diagnosed causes, impacts and fixes' },
                    { id: 'spikes', label: 'Emerging Issues & Z-Score Anomalies', desc: 'Statistical surge detection with severity interpretation' },
                    { id: 'trends', label: 'Temporal Trends', desc: 'Sentiment and service metric trends over recent periods' },
                    { id: 'recommendations', label: 'Strategic Recommendations', desc: 'Prioritized action items with owner and issue attribution' },
                    { id: 'dimensions', label: 'Dimensional Breakdown', desc: 'Region, company, and product-level performance slicing' },
                    { id: 'methodology', label: 'Methodology & Data Notes', desc: 'How metrics are calculated and data scope disclosure' },
                  ].map((sec) => (
                    <div
                      key={sec.id}
                      onClick={() => toggleSection(sec.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                        selectedSections[sec.id]
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border ${
                        selectedSections[sec.id] ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {selectedSections[sec.id] && <Check className="w-3 h-3" />}
                      </div>
                      <div className="flex-1">
                        <span className="font-bold block leading-snug">{sec.label}</span>
                        <span className={`text-[10px] leading-snug block mt-0.5 ${selectedSections[sec.id] ? 'text-slate-300' : 'text-slate-400'}`}>
                          {sec.desc}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 4: Export Format Selection */}
              <div className="space-y-3">
                <label className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileDown className="w-4 h-4 text-indigo-600" />
                  <span>4. Choose Publication Export Format</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  {[
                    { id: 'pdf', title: 'Publication PDF', desc: 'Board-ready formatted multi-page PDF', icon: FileText, color: 'text-rose-600' },
                    { id: 'markdown', title: 'Markdown (.md)', desc: 'Notion, GitHub & Slack ready markdown', icon: Code, color: 'text-indigo-600' },
                    { id: 'csv', title: 'Aggregated CSV', desc: 'Structured tabular data for Excel & Sheets', icon: TableIcon, color: 'text-emerald-600' },
                    { id: 'json', title: 'Raw JSON Payload', desc: 'Full structured JSON schema for APIs & BI', icon: Code, color: 'text-amber-600' },
                  ].map((fmt) => {
                    const Icon = fmt.icon;
                    const isSelected = exportFormat === fmt.id;
                    return (
                      <div
                        key={fmt.id}
                        onClick={() => setExportFormat(fmt.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Icon className={`w-4 h-4 ${fmt.color}`} />
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{fmt.title}</span>
                          <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">{fmt.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Live Markdown / Report Preview Tab */
            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 uppercase">Live Synthesized Report Preview</span>
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                    Scope: {timePeriod.toUpperCase()} {selectedYear ? `(${selectedYear})` : ''} {selectedMonth ? `(Month ${selectedMonth})` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyMarkdown}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied!' : 'Copy Markdown'}</span>
                  </button>
                  <button
                    onClick={fetchLivePreview}
                    disabled={isLoadingPreview}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                    title="Refresh preview"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPreview ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {isLoadingPreview ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                  <p>Synthesizing live document preview from neural clusters & PostgreSQL partitions...</p>
                </div>
              ) : previewData?.markdown ? (
                <div className="bg-slate-950 text-slate-200 p-5 rounded-xl border border-slate-800 overflow-x-auto max-h-[420px] whitespace-pre-wrap font-mono text-[11px] leading-relaxed select-text">
                  {previewData.markdown}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400">
                  No preview generated yet. Click "Refresh Preview" to compile live metrics.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Grounded against {activeRunId === 'all' ? 'All Uploaded Datasets' : `Run #${activeRunId?.slice(0, 8)}`} (Zero Hallucination)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors font-mono text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => handleExport(exportFormat)}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold transition-all shadow-md shadow-indigo-200 disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              <span>{isExporting ? 'Generating Report...' : `Export ${exportFormat.toUpperCase()} Report`}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
