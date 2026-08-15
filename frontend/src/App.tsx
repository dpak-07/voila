import React from 'react';
import { useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { ToastContainer } from './components/common/ToastContainer';
import { ExecutiveOverviewView } from './views/ExecutiveOverviewView';
import { AuthView } from './views/AuthView';

export const MainDashboard: React.FC = () => {
  const { user } = useApp();

  // If unauthenticated, display the Auth Portal (Login / Register)
  if (!user) {
    return (
      <>
        <AuthView />
        <ToastContainer />
      </>
    );
  }

  // Once authenticated, display the full Professional Analytics Dashboard
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Professional Analytics Workspace */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 w-full space-y-6 overflow-y-auto min-w-0">
        <ExecutiveOverviewView />
      </main>

      {/* Stacking Toast Manager */}
      <ToastContainer />
    </div>
  );
};

export default MainDashboard;
