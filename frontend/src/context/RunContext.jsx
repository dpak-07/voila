import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analytics';

const RunContext = createContext(null);

export function RunProvider({ children }) {
  const [activeRunId, setActiveRunId] = useState('all');
  const [dateRangeInfo, setDateRangeInfo] = useState({
    min_date: null,
    max_date: null,
    available_years: [],
    available_months: [],
    available_companies: [],
    available_products: [],
    available_regions: [],
  });
  const [filters, setFilters] = useState({
    time_period: 'overall',
    year: null,
    month: null,
    start_year: null,
    end_year: null,
    start_date: '',
    end_date: '',
    company: '',
    product: '',
    region: '',
  });

  const { data: runsData, isLoading: isLoadingRuns, refetch: refetchRuns } = useQuery({
    queryKey: ['dataset_runs'],
    queryFn: () => analyticsApi.getRuns(),
    refetchInterval: 20000,
  });

  const runs = Array.isArray(runsData?.runs) ? runsData.runs : (Array.isArray(runsData) ? runsData : []);

  // Compute total combined records across all runs
  const totalCombinedRecords = runs.reduce((sum, r) => sum + (Number(r.total_records) || 0), 0);

  const activeRun = activeRunId === 'all'
    ? { run_id: 'all', source_name: 'All Combined Datasets', total_records: totalCombinedRecords }
    : (runs.find((r) => r.run_id === activeRunId) || (runs.length > 0 ? runs[0] : null));

  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      time_period: 'overall',
      year: null,
      month: null,
      start_year: null,
      end_year: null,
      start_date: '',
      end_date: '',
      company: '',
      product: '',
      region: '',
    });
  };

  const value = {
    runs,
    activeRunId,
    activeRun,
    setActiveRunId,
    isAllRunsMode: activeRunId === 'all',
    totalCombinedRecords,
    dateRangeInfo,
    setDateRangeInfo,
    isLoadingRuns,
    refetchRuns,
    filters,
    updateFilter,
    resetFilters,
  };

  return <RunContext.Provider value={value}>{children}</RunContext.Provider>;
}

export function useRun() {
  const context = useContext(RunContext);
  if (!context) {
    throw new Error('useRun must be used within a RunProvider');
  }
  return context;
}
