import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AnalysisHubResponse, DatasetRun, PipelineLog, FilterState, TimePeriod } from '../types';
import { api } from '../services/api';

export type NavTab = 'overview' | 'analytics' | 'topics' | 'chatbot' | 'ingestion' | 'comparison';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface AppContextType {
  data: AnalysisHubResponse | null;
  isLoading: boolean;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  setCadence: (period: TimePeriod) => void;
  setRunId: (runId: string | null) => void;
  runs: DatasetRun[];
  activeRun: DatasetRun | null;
  pipelineLogs: PipelineLog[];
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isChatDrawerOpen: boolean;
  setIsChatDrawerOpen: (open: boolean) => void;
  toasts: ToastItem[];
  addToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;
  refreshData: () => Promise<void>;
  user: { username: string; email: string; role: string };
  setUser: (user: { username: string; email: string; role: string }) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AnalysisHubResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [runs, setRuns] = useState<DatasetRun[]>([]);
  const [pipelineLogs, setPipelineLogs] = useState<PipelineLog[]>([]);
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [user, setUser] = useState({ username: 'Deepak Patel', email: 'deepak@voila.ai', role: 'Executive Lead' });

  const [filters, setFilters] = useState<FilterState>({
    timePeriod: 'weekly',
    runId: null,
    company: null,
    product: null,
    region: null,
    searchQuery: '',
  });

  const addToast = useCallback((title: string, message?: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setCadence = useCallback((period: TimePeriod) => {
    setFilters((prev) => ({ ...prev, timePeriod: period }));
  }, []);

  const setRunId = useCallback((runId: string | null) => {
    setFilters((prev) => ({ ...prev, runId }));
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [hubData, runsData, logsData] = await Promise.all([
        api.getAnalysisHub(filters),
        api.getDatasetRuns(),
        api.getPipelineStatus(),
      ]);
      setData(hubData);
      setRuns(runsData);
      setPipelineLogs(logsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      addToast('Data Sync Notice', 'Operating on offline cached intelligence engine data.', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [filters, addToast]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const activeRun = runs.find((r) => r.run_id === filters.runId) || runs[0] || null;

  return (
    <AppContext.Provider
      value={{
        data,
        isLoading,
        filters,
        setFilters,
        setCadence,
        setRunId,
        runs,
        activeRun,
        pipelineLogs,
        activeTab,
        setActiveTab,
        isChatDrawerOpen,
        setIsChatDrawerOpen,
        toasts,
        addToast,
        removeToast,
        refreshData,
        user,
        setUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
