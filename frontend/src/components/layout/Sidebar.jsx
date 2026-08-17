import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Layers, 
  Sparkles, 
  UploadCloud, 
  GitCompare, 
  LogOut, 
  Database,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRun } from '../../context/RunContext';

export function Sidebar({ isCollapsed = false, onToggle }) {
  const { user, logout } = useAuth();
  const { activeRun } = useRun();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-indigo-600', activeBg: 'bg-indigo-600 text-white', end: true },
    { to: '/dashboard/topics', label: 'Topic Clusters', icon: Layers, color: 'text-emerald-600', activeBg: 'bg-emerald-600 text-white' },
    { to: '/dashboard/ask', label: 'Ask the Data', icon: Sparkles, color: 'text-amber-600', activeBg: 'bg-amber-600 text-white' },
    { to: '/upload', label: 'Upload & Pipeline', icon: UploadCloud, color: 'text-violet-600', activeBg: 'bg-violet-600 text-white' },
    { to: '/dashboard/compare', label: 'Dataset Delta', icon: GitCompare, color: 'text-rose-600', activeBg: 'bg-rose-600 text-white' },
  ];

  return (
    <aside 
      className={`${
        isCollapsed ? 'w-16' : 'w-60'
      } bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none z-30 shadow-2xs transition-[width] duration-200 ease-in-out will-change-[width] overflow-hidden`}
    >
      {/* Top Header & Navigation */}
      <div className="flex flex-col min-w-0">
        {/* Brand & Logo Header */}
        <div className={`h-16 px-3.5 flex items-center border-b border-slate-100 overflow-hidden ${
          isCollapsed ? 'justify-center' : 'justify-between'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center p-1 shrink-0">
              <img src="/voila-icon.png" alt="Voilà Logo" className="w-full h-full object-contain" />
            </div>
            <div 
              className={`transition-all duration-200 overflow-hidden whitespace-nowrap ${
                isCollapsed ? 'w-0 opacity-0 -translate-x-3 pointer-events-none' : 'w-auto opacity-100 translate-x-0'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-base tracking-tight text-slate-900">
                  Voilà<span className="text-indigo-600 font-extrabold">.ai</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-sans font-medium">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] font-sans text-slate-400 font-medium">
                Customer Intelligence
              </p>
            </div>
          </div>

          {/* Collapse Button */}
          {onToggle && !isCollapsed && (
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1.5 overflow-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-colors ${
                    isCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'
                  } ${
                    isActive
                      ? `${item.activeBg} font-bold shadow-sm`
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span 
                  className={`transition-all duration-200 overflow-hidden whitespace-nowrap ${
                    isCollapsed ? 'w-0 opacity-0 -translate-x-2' : 'w-auto opacity-100 translate-x-0'
                  }`}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer: Dataset Telemetry & User Account */}
      <div className="p-3 border-t border-slate-200 space-y-2.5 bg-slate-50/70 overflow-hidden">
        {/* Toggle button when collapsed */}
        {isCollapsed && onToggle && (
          <button
            onClick={onToggle}
            className="w-full py-1.5 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Expand Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}

        {/* Dataset telemetry */}
        {!isCollapsed ? (
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1">
              <span className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                Active Dataset
              </span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                {activeRun ? `${activeRun.total_records?.toLocaleString()} rows` : 'Online'}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-600 truncate" title={activeRun?.source_name || activeRun?.run_id || 'Global Schema'}>
              {activeRun?.source_name ? activeRun.source_name.split(/[/\\]/).pop() : (activeRun?.run_id ? `#${activeRun.run_id.slice(0, 8)}` : 'Global Baseline')}
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 mx-auto rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0" title="Active Dataset Online">
            <Database className="w-4 h-4" />
          </div>
        )}

        {/* User Card */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} pt-1 overflow-hidden`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              {user?.username ? user.username.slice(0, 2).toUpperCase() : 'DE'}
            </div>
            <div 
              className={`min-w-0 transition-all duration-200 overflow-hidden whitespace-nowrap ${
                isCollapsed ? 'w-0 opacity-0 -translate-x-2' : 'w-auto opacity-100 translate-x-0'
              }`}
            >
              <div className="text-xs font-bold text-slate-900 truncate">
                {user?.username || 'deepak'}
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate">
                {user?.email || 'deepak@voila.ai'}
              </div>
            </div>
          </div>

          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
