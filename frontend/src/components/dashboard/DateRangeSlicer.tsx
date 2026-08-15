import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TimePeriod } from '../../types';
import {
  Calendar,
  Database,
  UploadCloud,
  ChevronDown,
  Layers,
  Check,
  Filter,
} from 'lucide-react';

export const DateRangeSlicer: React.FC = () => {
  const {
    filters,
    setCadence,
    setRunId,
    runs,
    activeRun,
    setIsUploadModalOpen,
    addToast,
  } = useApp();

  const [isDatasetDropdownOpen, setIsDatasetDropdownOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('2026-08-15');
  const [selectedMonth, setSelectedMonth] = useState('2026-08');

  const cadenceOptions: { label: string; value: TimePeriod }[] = [
    { label: 'Weekly (Date Range)', value: 'weekly' },
    { label: 'Monthly (Month Range)', value: 'monthly' },
    { label: 'Overall (All-Time)', value: 'overall' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Dataset Selector & Upload Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Dataset Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDatasetDropdownOpen(!isDatasetDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-300 text-xs font-bold text-slate-800 transition shadow-2xs"
            >
              <Database className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="max-w-[200px] truncate">
                {filters.runId === null
                  ? 'All Uploaded Datasets (Overall)'
                  : activeRun?.dataset_name || activeRun?.filename || activeRun?.run_id || 'Selected Dataset'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {isDatasetDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-88 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 mb-1">
                  Filter by Specific Dataset
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1">
                  {/* Option: Overall Datasets */}
                  <button
                    onClick={() => {
                      setRunId(null);
                      setIsDatasetDropdownOpen(false);
                      addToast('Dataset Filter', 'Showing aggregated metrics across all uploaded datasets.', 'info');
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition ${
                      filters.runId === null
                        ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <p className="font-semibold">All Datasets (Overall Aggregated)</p>
                        <p className="text-[10px] text-slate-500">Includes all historic runs</p>
                      </div>
                    </div>
                    {filters.runId === null && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>

                  {/* Individual Runs */}
                  {runs.map((r) => {
                    const isSelected = filters.runId === r.run_id;
                    return (
                      <button
                        key={r.run_id}
                        onClick={() => {
                          setRunId(r.run_id);
                          setIsDatasetDropdownOpen(false);
                          addToast('Dataset Selected', `Loaded analytics for ${r.dataset_name || r.run_id}`, 'info');
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate font-semibold">{r.dataset_name || r.filename || r.run_id}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {r.total_rows ? `${r.total_rows.toLocaleString()} rows` : ''} • {r.timestamp || 'Uploaded'}
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Action: Upload New Dataset */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="btn-primary py-2 px-3.5 text-xs flex items-center gap-1.5"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload New Dataset</span>
          </button>
        </div>

        {/* Right: Date Range Cadence Slicer (Weekly, Monthly, Overall) */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            {cadenceOptions.map((opt) => {
              const isActive = filters.timePeriod === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    setCadence(opt.value);
                    addToast('Cadence Updated', `Showing ${opt.label} analytics view.`, 'info');
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Date Picker Input when Weekly is selected */}
          {filters.timePeriod === 'weekly' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  addToast('Date Filtered', `Filtered week for ${e.target.value}`, 'info');
                }}
                className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer"
              />
            </div>
          )}

          {/* Month Picker Input when Monthly is selected */}
          {filters.timePeriod === 'monthly' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  addToast('Month Filtered', `Filtered month for ${e.target.value}`, 'info');
                }}
                className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
