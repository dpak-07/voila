import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { FloatingTopNav } from './FloatingTopNav';
import { FloatingChatBot } from '../agent/FloatingChatBot';

export function AppLayout() {
  const location = useLocation();
  const isAskPage = location.pathname.includes('/ask');

  return (
    <div className={`bg-[#f8fafc] dark:bg-[#07090e] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-300 ${
      isAskPage ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'
    }`}>
      {/* Sleek Floating Glassmorphic Top Navigation */}
      <FloatingTopNav />

      {/* Main Content Area */}
      <main className={`flex-1 w-full mx-auto ${
        isAskPage 
          ? 'pt-16 sm:pt-18 px-2 sm:px-4 lg:px-6 max-w-[1800px] h-[calc(100vh-10px)] overflow-hidden pb-2' 
          : 'pt-20 sm:pt-24 px-3 sm:px-6 lg:px-8 max-w-[1560px] pb-16'
      }`}>
        <Outlet />
      </main>

      {/* Persistent Global AI Copilot (hidden on dedicated AI Ask page) */}
      {!isAskPage && <FloatingChatBot />}
    </div>
  );
}

export default AppLayout;
