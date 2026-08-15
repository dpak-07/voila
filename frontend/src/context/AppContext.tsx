import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AnalysisHubResponse, DatasetRun, PipelineLog, FilterState, TimePeriod } from '../types';
import { api } from '../services/api';

export interface UserState {
  id: string;
  username: string;
  email: string;
  role?: string;
}

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface AppContextType {
  user: UserState | null;
  isAuthenticated: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  register: (user: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  data: AnalysisHubResponse | null;
  isLoading: boolean;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  setCadence: (period: TimePeriod) => void;
  setRunId: (runId: string | null) => void;
  runs: DatasetRun[];
  activeRun: DatasetRun | null;
  pipelineLogs: PipelineLog[];
  isChatDrawerOpen: boolean;
  setIsChatDrawerOpen: (open: boolean) => void;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;
  toasts: ToastItem[];
  addToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AnalysisHubResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [runs, setRuns] = useState<DatasetRun[]>([]);
  const [pipelineLogs, setPipelineLogs] = useState<PipelineLog[]>([]);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // User state
  const [user, setUser] = useState<UserState | null>(() => {
    const savedUser = localStorage.getItem('voila_user');
    const savedToken = localStorage.getItem('voila_token');
    if (savedUser && savedToken) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const isAuthenticated = Boolean(user && localStorage.getItem('voila_token'));

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

  const login = async (identifier: string, pass: string) => {
    try {
      const res = await api.login(identifier, pass);
      setUser(res.user);
      addToast('Welcome Back!', `Logged in as ${res.user.username}`, 'success');
      await refreshData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Login failed';
      addToast('Authentication Failed', msg, 'error');
      throw err;
    }
  };

  const register = async (username: string, email: string, pass: string) => {
    try {
      const res = await api.register(username, email, pass);
      setUser(res.user);
      addToast('Registration Successful', `Account created for ${res.user.username}!`, 'success');
      await refreshData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Registration failed';
      addToast('Registration Failed', msg, 'error');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('voila_token');
    localStorage.removeItem('voila_user');
    setUser(null);
    addToast('Signed Out', 'You have been successfully logged out.', 'info');
  };

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
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const activeRun = runs.find((r) => r.run_id === filters.runId) || runs[0] || null;

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        register,
        logout,
        data,
        isLoading,
        filters,
        setFilters,
        setCadence,
        setRunId,
        runs,
        activeRun,
        pipelineLogs,
        isChatDrawerOpen,
        setIsChatDrawerOpen,
        isUploadModalOpen,
        setIsUploadModalOpen,
        toasts,
        addToast,
        removeToast,
        refreshData,
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
