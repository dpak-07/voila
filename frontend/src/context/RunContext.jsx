import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analytics';

const RunContext = createContext(null);

export function RunProvider({ children }) {
  const [activeRunId, setActiveRunId] = useState('all');
  const [selectedCompany, setSelectedCompanyState] = useState(() => {
    // Persist company selection across page reloads
    return localStorage.getItem('voila_selected_company') || null;
  });
  const [dateRangeInfo, setDateRangeInfoState] = useState({
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
    company: localStorage.getItem('voila_selected_company') || '',
    product: '',
    region: '',
    language: '',
  });

  const { data: runsData, isLoading: isLoadingRuns, refetch: refetchRuns } = useQuery({
    queryKey: ['dataset_runs'],
    queryFn: () => analyticsApi.getRuns(),
    staleTime: 60000,
  });

  const runs = useMemo(() => {
    return Array.isArray(runsData?.runs) ? runsData.runs : (Array.isArray(runsData) ? runsData : []);
  }, [runsData]);

  // Compute total combined records across all runs
  const totalCombinedRecords = useMemo(() => {
    return runs.reduce((sum, r) => sum + (Number(r.total_records) || 0), 0);
  }, [runs]);

  // If database has 0 records, automatically clear any stale company selection
  React.useEffect(() => {
    if (!isLoadingRuns && runs.length === 0 && totalCombinedRecords === 0) {
      if (selectedCompany) {
        setSelectedCompanyState(null);
        localStorage.removeItem('voila_selected_company');
        setFilters((prev) => ({ ...prev, company: '' }));
      }
    }
  }, [isLoadingRuns, runs.length, totalCombinedRecords, selectedCompany]);

  const activeRun = useMemo(() => {
    return activeRunId === 'all'
      ? { run_id: 'all', source_name: 'All Combined Datasets', total_records: totalCombinedRecords }
      : (runs.find((r) => r.run_id === activeRunId) || (runs.length > 0 ? runs[0] : null));
  }, [activeRunId, runs, totalCombinedRecords]);

  const setDateRangeInfo = useCallback((newInfo) => {
    setDateRangeInfoState((prev) => {
      if (!newInfo) return prev;
      if (
        prev.min_date === newInfo.min_date &&
        prev.max_date === newInfo.max_date &&
        prev.available_years?.length === newInfo.available_years?.length &&
        prev.available_companies?.length === newInfo.available_companies?.length &&
        prev.available_products?.length === newInfo.available_products?.length &&
        prev.available_regions?.length === newInfo.available_regions?.length
      ) {
        return prev;
      }
      return newInfo;
    });
  }, []);

  const setSelectedCompany = useCallback((company) => {
    setSelectedCompanyState(company);
    if (company) {
      localStorage.setItem('voila_selected_company', company);
      // Auto-apply as company filter
      setFilters((prev) => ({ ...prev, company }));
    } else {
      localStorage.removeItem('voila_selected_company');
      setFilters((prev) => ({ ...prev, company: '' }));
    }
  }, []);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => {
      if (prev[key] === value) return prev;
      // If user manually clears the company filter, also clear selectedCompany
      if (key === 'company' && !value) {
        setSelectedCompanyState(null);
        localStorage.removeItem('voila_selected_company');
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const resetFilters = useCallback(() => {
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
      language: '',
    });
    setSelectedCompanyState(null);
    localStorage.removeItem('voila_selected_company');
  }, []);

  const value = useMemo(() => ({
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
    // Company selection
    selectedCompany,
    setSelectedCompany,
  }), [
    runs,
    activeRunId,
    activeRun,
    totalCombinedRecords,
    dateRangeInfo,
    setDateRangeInfo,
    isLoadingRuns,
    refetchRuns,
    filters,
    updateFilter,
    resetFilters,
    selectedCompany,
    setSelectedCompany,
  ]);

  return <RunContext.Provider value={value}>{children}</RunContext.Provider>;
}

export function useRun() {
  const context = useContext(RunContext);
  if (!context) {
    throw new Error('useRun must be used within a RunProvider');
  }
  return context;
}
