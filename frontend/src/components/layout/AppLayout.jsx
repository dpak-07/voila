import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { FloatingChatBot } from '../agent/FloatingChatBot';

export function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('voila_sidebar_collapsed');
    return saved !== null ? saved === 'true' : true; // Default closed/collapsed as requested
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('voila_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-zinc-900">
      {/* Collapsible Sticky Sidebar */}
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={handleToggleSidebar} 
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <TopBar onToggleSidebar={handleToggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Persistent Global AI Copilot */}
      <FloatingChatBot />
    </div>
  );
}

export default AppLayout;
