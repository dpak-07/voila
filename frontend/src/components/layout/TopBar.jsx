import React, { useState } from 'react';
import { 
  FileDown, 
  Sparkles, 
  Filter, 
  Layers, 
  Calendar, 
  RefreshCw,
  ChevronDown,
  X,
  Check,
  PanelLeftOpen,
  PanelLeftClose,
  Menu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRun } from '../../context/RunContext';
import { analyticsApi } from '../../api/analytics';

export function TopBar({ onToggleSidebar, isSidebarCollapsed }) {
  const { 
    runs, 
    activeRunId, 
    setActiveRunId, 
    totalCombinedRecords,
    dateRangeInfo,
    filters, 
    updateFilter, 
    resetFilters,
    isLoadingRuns,
    refetchRuns 
  } = useRun();
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const navigate = useNavigate();

  const handleDownloadReport = async () => {
    try {
      setIsDownloading(true);
      await analyticsApi.downloadReport({
        run_id: activeRunId === 'all' ? undefined : activeRunId,
        time_period: filters.time_period,
        start_year: filters.start_year || filters.year || undefined,
        end_year: filters.end_year || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
        company: filters.company || undefined,
        product: filters.product || undefined,
        region: filters.region || undefined,
      });
    } catch (err) {
      console.error('[Download report error]:', err);
      alert('Report generation encountered an issue. Ensure backend has report dependencies.');
    } finally {
      setIsDownloading(false);
    }
  };

  const periods = [
    { id: 'overall', label: 'All-Time' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'daily', label: 'Daily' },
  ];

  const hasActiveFilters = Boolean(filters.company || filters.product || filters.region);
  const hasDateFilter = Boolean(filters.year || filters.start_year || filters.start_date);

  return (
    <header className="h-16 px-4 sm:px-6 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left: Sidebar Toggle + Active Run Selector & Time Range */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 shadow-2xs"
            title="Toggle Sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        {/* Dataset Run Switcher */}
        <div className="relative">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 hover:border-zinc-300 transition-colors">
            <Layers className="w-3.5 h-3.5 text-zinc-900" />
            <select
              value={activeRunId || 'all'}
              onChange={(e) => setActiveRunId(e.target.value)}
              className="bg-transparent text-xs font-mono text-zinc-900 outline-none cursor-pointer pr-2 font-medium"
              disabled={isLoadingRuns || runs.length === 0}
            >
              <option value="all" className="bg-white text-zinc-900 font-bold">
                All Uploaded Datasets Combined ({totalCombinedRecords.toLocaleString()} msgs)
              </option>
              {runs.map((r, idx) => (
                <option key={r.run_id} value={r.run_id} className="bg-white text-zinc-800">
                  Run #{idx + 1} · {r.run_id.slice(0, 8)} ({r.total_records?.toLocaleString() || 0} rows)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Time Period Granularity Pills */}
        <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => updateFilter('time_period', p.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                filters.time_period === p.id
                  ? 'bg-zinc-900 text-white font-bold shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Range / Multi-Year / Monthly Filter Button */}
        <div className="relative">
          <button
            onClick={() => setShowDateDropdown(!showDateDropdown)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-colors border ${
              hasDateFilter
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:text-zinc-900 hover:border-zinc-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {filters.month
                ? `Month: ${filters.month}`
                : (filters.year
                  ? `Year ${filters.year}`
                  : (filters.start_year && filters.end_year
                    ? `${filters.start_year} - ${filters.end_year}`
                    : (filters.start_date
                      ? `${filters.start_date} → ${filters.end_date || 'now'}`
                      : 'Date & Period Slices')))}
            </span>
            {hasDateFilter && <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />}
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>

          {/* Dynamic Date / Month / Year Dropdown Popover */}
          {showDateDropdown && (
            <div className="absolute top-full left-0 mt-2 w-96 min-w-[340px] max-w-sm p-4 rounded-xl bg-white border border-zinc-200 shadow-2xl z-50 signal-card text-zinc-900 whitespace-normal">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-200">
                <div>
                  <span className="text-xs font-mono font-bold text-zinc-900 uppercase block">
                    Dynamic Date & Temporal Slices
                  </span>
                  {dateRangeInfo?.min_date && dateRangeInfo?.max_date && (
                    <span className="text-[10px] font-mono text-zinc-500">
                      Span: {dateRangeInfo.min_date} to {dateRangeInfo.max_date}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowDateDropdown(false)}
                  className="text-zinc-400 hover:text-zinc-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs max-h-80 overflow-y-auto pr-1">
                {/* Dynamic Years Extracted from Dataset */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] text-zinc-600 font-semibold">
                      Calendar Years in Dataset:
                    </label>
                    {dateRangeInfo?.available_years?.length > 0 && (
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {dateRangeInfo.available_years.length} detected
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => {
                        updateFilter('year', null);
                        updateFilter('month', null);
                        updateFilter('start_year', null);
                        updateFilter('end_year', null);
                      }}
                      className={`px-2.5 py-1 rounded text-center transition-all ${
                        !filters.year && !filters.month && !filters.start_date
                          ? 'bg-zinc-900 text-white font-bold'
                          : 'bg-zinc-100 text-zinc-700 hover:text-zinc-900 border border-zinc-200'
                      }`}
                    >
                      All Years
                    </button>
                    {Array.isArray(dateRangeInfo?.available_years) && dateRangeInfo.available_years.length > 0 ? (
                      dateRangeInfo.available_years.map((yr) => (
                        <button
                          key={yr}
                          onClick={() => {
                            updateFilter('year', Number(filters.year) === Number(yr) ? null : yr);
                            updateFilter('month', null);
                            updateFilter('start_year', null);
                            updateFilter('end_year', null);
                          }}
                          className={`px-2.5 py-1 rounded text-center transition-all ${
                            Number(filters.year) === Number(yr)
                              ? 'bg-zinc-900 text-white font-bold'
                              : 'bg-zinc-100 text-zinc-700 hover:text-zinc-900 border border-zinc-200'
                          }`}
                        >
                          {yr}
                        </button>
                      ))
                    ) : (
                      <span className="text-[11px] text-zinc-400 italic block py-1">
                        Upload a dataset to extract available calendar years
                      </span>
                    )}
                  </div>
                </div>

                {/* Dynamic Months in Dataset */}
                {Array.isArray(dateRangeInfo?.available_months) && dateRangeInfo.available_months.length > 0 && (
                  <div className="pt-2 border-t border-zinc-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] text-zinc-600 font-semibold">
                        Monthly Slices in Dataset:
                      </label>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {dateRangeInfo.available_months.length} months
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {dateRangeInfo.available_months.map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            updateFilter('month', filters.month === m ? null : m);
                            updateFilter('year', null);
                            updateFilter('start_date', '');
                            updateFilter('end_date', '');
                          }}
                          className={`px-2 py-1 rounded text-[11px] transition-all ${
                            filters.month === m
                              ? 'bg-zinc-900 text-white font-bold shadow-xs'
                              : 'bg-zinc-100 text-zinc-700 hover:text-zinc-900 border border-zinc-200'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Date Range Window */}
                <div className="pt-2 border-t border-zinc-200">
                  <label className="block text-[11px] text-zinc-600 mb-1.5 font-semibold">
                    Custom Date Window:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-zinc-500 block mb-1">From Date</span>
                      <input
                        type="date"
                        min={dateRangeInfo?.min_date || undefined}
                        max={dateRangeInfo?.max_date || undefined}
                        value={filters.start_date}
                        onChange={(e) => {
                          updateFilter('start_date', e.target.value);
                          updateFilter('year', null);
                          updateFilter('month', null);
                        }}
                        className="w-full px-2 py-1 rounded bg-zinc-50 border border-zinc-300 text-[11px] text-zinc-900 outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block mb-1">To Date</span>
                      <input
                        type="date"
                        min={dateRangeInfo?.min_date || undefined}
                        max={dateRangeInfo?.max_date || undefined}
                        value={filters.end_date}
                        onChange={(e) => {
                          updateFilter('end_date', e.target.value);
                          updateFilter('year', null);
                          updateFilter('month', null);
                        }}
                        className="w-full px-2 py-1 rounded bg-zinc-50 border border-zinc-300 text-[11px] text-zinc-900 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {hasDateFilter && (
                  <button
                    onClick={() => {
                      updateFilter('year', null);
                      updateFilter('month', null);
                      updateFilter('start_year', null);
                      updateFilter('end_year', null);
                      updateFilter('start_date', '');
                      updateFilter('end_date', '');
                    }}
                    className="w-full py-1 text-center text-xs text-rose-600 hover:underline pt-1 font-semibold"
                  >
                    Clear Temporal Filters (All-Time)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filters Popover Button */}
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-colors border ${
              hasActiveFilters
                ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:text-zinc-900 hover:border-zinc-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>
              {filters.company
                ? `Brand: ${filters.company}`
                : (filters.product
                  ? `Product: ${filters.product}`
                  : (filters.region
                    ? `Region: ${filters.region}`
                    : 'Slices'))}
            </span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>

          {/* Filter Dropdown Modal with Auto-Recommendations */}
          {showFilterDropdown && (
            <div className="absolute top-full left-0 mt-2 w-96 min-w-[340px] max-w-sm p-4 rounded-xl bg-white border border-zinc-200 shadow-2xl z-50 signal-card text-zinc-900 whitespace-normal">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-200">
                <div>
                  <span className="text-xs font-mono font-bold text-zinc-900 uppercase block">
                    Dataset Dimension Slices
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Auto-extracted from active dataset
                  </span>
                </div>
                <button
                  onClick={() => setShowFilterDropdown(false)}
                  className="text-zinc-400 hover:text-zinc-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3.5 font-mono text-xs max-h-88 overflow-y-auto pr-1">
                {/* 1. Company / Brand */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] text-zinc-700 font-semibold">Company / Brand</label>
                    {filters.company && (
                      <button 
                        onClick={() => updateFilter('company', '')}
                        className="text-[10px] text-rose-500 hover:underline"
                      >
                        clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    list="company-dataset-suggestions"
                    value={filters.company}
                    onChange={(e) => updateFilter('company', e.target.value)}
                    placeholder="e.g. AppleSupport, Uber..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 outline-none"
                  />
                  <datalist id="company-dataset-suggestions">
                    {(dateRangeInfo?.available_companies || []).map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>

                  {/* Auto-recommended company pills */}
                  {Array.isArray(dateRangeInfo?.available_companies) && dateRangeInfo.available_companies.length > 0 && (
                    <div className="mt-1.5">
                      <span className="text-[10px] text-zinc-400 block mb-1">Recommended in data:</span>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {dateRangeInfo.available_companies.map((c) => (
                          <button
                            key={c}
                            onClick={() => updateFilter('company', filters.company === c ? '' : c)}
                            className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                              filters.company === c
                                ? 'bg-zinc-900 text-white font-bold shadow-xs'
                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Product */}
                <div className="pt-2 border-t border-zinc-100">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] text-zinc-700 font-semibold">Product</label>
                    {filters.product && (
                      <button 
                        onClick={() => updateFilter('product', '')}
                        className="text-[10px] text-rose-500 hover:underline"
                      >
                        clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    list="product-dataset-suggestions"
                    value={filters.product}
                    onChange={(e) => updateFilter('product', e.target.value)}
                    placeholder="e.g. iPhone, Mobile App..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 outline-none"
                  />
                  <datalist id="product-dataset-suggestions">
                    {(dateRangeInfo?.available_products || []).map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>

                  {/* Auto-recommended product pills */}
                  {Array.isArray(dateRangeInfo?.available_products) && dateRangeInfo.available_products.length > 0 && (
                    <div className="mt-1.5">
                      <span className="text-[10px] text-zinc-400 block mb-1">Recommended in data:</span>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {dateRangeInfo.available_products.map((p) => (
                          <button
                            key={p}
                            onClick={() => updateFilter('product', filters.product === p ? '' : p)}
                            className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                              filters.product === p
                                ? 'bg-zinc-900 text-white font-bold shadow-xs'
                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Region */}
                <div className="pt-2 border-t border-zinc-100">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] text-zinc-700 font-semibold">Region</label>
                    {filters.region && (
                      <button 
                        onClick={() => updateFilter('region', '')}
                        className="text-[10px] text-rose-500 hover:underline"
                      >
                        clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    list="region-dataset-suggestions"
                    value={filters.region}
                    onChange={(e) => updateFilter('region', e.target.value)}
                    placeholder="e.g. US-West, Mumbai..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 outline-none"
                  />
                  <datalist id="region-dataset-suggestions">
                    {(dateRangeInfo?.available_regions || []).map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>

                  {/* Auto-recommended region pills */}
                  {Array.isArray(dateRangeInfo?.available_regions) && dateRangeInfo.available_regions.length > 0 && (
                    <div className="mt-1.5">
                      <span className="text-[10px] text-zinc-400 block mb-1">Recommended in data:</span>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {dateRangeInfo.available_regions.map((r) => (
                          <button
                            key={r}
                            onClick={() => updateFilter('region', filters.region === r ? '' : r)}
                            className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                              filters.region === r
                                ? 'bg-zinc-900 text-white font-bold shadow-xs'
                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="w-full py-1.5 text-center text-xs font-semibold text-rose-600 hover:underline pt-2 border-t border-zinc-100"
                  >
                    Clear All Dimension Slices
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center gap-3">
        {/* Export PDF Report */}
        <button
          onClick={handleDownloadReport}
          disabled={isDownloading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition-colors text-xs font-semibold"
          title="Download verified executive report PDF"
        >
          <FileDown className="w-4 h-4 text-zinc-300" />
          <span>{isDownloading ? 'Generating PDF...' : 'Export Report'}</span>
        </button>

        {/* Ask AI Trigger */}
        <button
          onClick={() => navigate('/ask')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold transition-all shadow-sm text-xs"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ask the Data</span>
        </button>
      </div>
    </header>
  );
}

export default TopBar;
