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
import { CustomReportModal } from '../dashboard/CustomReportModal';

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
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const navigate = useNavigate();

  const hasActiveFilters = Boolean(filters.company || filters.product || filters.region);

  return (
    <header className="h-16 px-4 sm:px-6 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left: Sidebar Toggle + Active Run Selector & Time Range */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 shadow-2xs cursor-pointer shrink-0"
            title="Toggle Sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        {/* Dataset Run Switcher */}
        <div className="relative min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
            <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <select
              value={activeRunId || 'all'}
              onChange={(e) => setActiveRunId(e.target.value)}
              className="bg-transparent text-xs font-mono text-slate-900 outline-none cursor-pointer pr-1 font-medium max-w-[160px] xs:max-w-[220px] sm:max-w-xs md:max-w-md truncate"
              disabled={isLoadingRuns || runs.length === 0}
            >
              <option value="all" className="bg-white text-slate-900 font-bold">
                All Datasets Combined ({totalCombinedRecords.toLocaleString()} msgs)
              </option>
              {runs.map((r, idx) => (
                <option key={r.run_id} value={r.run_id} className="bg-white text-slate-800">
                  Run #{idx + 1} · {r.run_id.slice(0, 8)} ({r.total_records?.toLocaleString() || 0} rows)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters Popover Button */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono transition-colors border cursor-pointer ${
              hasActiveFilters
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">
              {filters.company
                ? `Brand: ${filters.company}`
                : (filters.product
                  ? `Product: ${filters.product}`
                  : (filters.region
                    ? `Region: ${filters.region}`
                    : 'Slices'))}
            </span>
            <span className="sm:hidden">
              {hasActiveFilters ? 'Filtered' : 'Slices'}
            </span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>

          {/* Filter Dropdown Modal with Auto-Recommendations */}
          {showFilterDropdown && (
            <div className="absolute top-full left-0 mt-2 w-80 xs:w-96 min-w-[280px] sm:min-w-[340px] max-w-sm p-4 rounded-xl bg-white border border-slate-200 shadow-2xl z-50 signal-card text-slate-900 whitespace-normal">
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
        {/* Custom Report Studio Trigger */}
        <button
          onClick={() => setIsReportModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 transition-colors text-xs font-semibold shadow-xs"
          title="Open Custom Report Studio"
        >
          <FileDown className="w-4 h-4 text-indigo-400" />
          <span>Export Report</span>
        </button>

        {/* Ask AI Trigger */}
        <button
          onClick={() => navigate('/ask')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold transition-all shadow-xs text-xs"
        >
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Ask the Data</span>
        </button>
      </div>

      {/* Enterprise Custom Report Studio Modal */}
      <CustomReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </header>
  );
}

export default TopBar;
