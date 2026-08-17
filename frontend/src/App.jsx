import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RunProvider } from './context/RunContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { AskDataPage } from './pages/AskDataPage';
import { ComparePage } from './pages/ComparePage';
import { TopicClustersPage } from './pages/TopicClustersPage';
import { CompanySelectPage } from './pages/CompanySelectPage';
import { NotFoundPage } from './pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 60000,
      gcTime: 300000,
    },
  },
});

import { GlobalLoadingScreen } from './components/common/GlobalLoadingScreen';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ScrollToTop } from './components/common/ScrollToTop';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <GlobalLoadingScreen message="Authenticating Session..." subtext="Verifying security credentials" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RunProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <ScrollToTop />
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Home = Company Picker */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <CompanySelectPage />
                    </ProtectedRoute>
                  }
                />

                {/* Legacy alias */}
                <Route path="/company-select" element={<Navigate to="/" replace />} />

                {/* Analytics Workspace — uses AppLayout with persistent nav */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="topics" element={<TopicClustersPage />} />
                  <Route path="ask" element={<AskDataPage />} />
                  <Route path="compare" element={<ComparePage />} />
                </Route>

                {/* Upload lives under AppLayout too (keeps the nav) */}
                <Route
                  path="/upload"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<UploadPage />} />
                </Route>

                {/* Topic / Ask / Compare shortcuts at root level */}
                <Route path="/topics" element={<Navigate to="/dashboard/topics" replace />} />
                <Route path="/ask" element={<Navigate to="/dashboard/ask" replace />} />
                <Route path="/compare" element={<Navigate to="/dashboard/compare" replace />} />

                {/* 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
          </RunProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
