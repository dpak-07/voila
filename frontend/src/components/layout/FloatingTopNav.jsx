import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Layers, 
  Bot, 
  UploadCloud, 
  GitCompare, 
  FileDown, 
  Filter, 
  LogOut, 
  Database,
  ChevronDown,
  X,
  Check,
  Menu,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRun } from '../../context/RunContext';
import { useTheme } from '../../context/ThemeContext';
import { CustomReportModal } from '../dashboard/CustomReportModal';

export function FloatingTopNav() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { 
    runs, 
    activeRunId, 
    setActiveRunId, 
    totalCombinedRecords,
    filters, 
    updateFilter, 
    resetFilters,
    isLoadingRuns,
  } = useRun();

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const hasActiveFilters = Boolean(filters.company || filters.product || filters.region);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/topics', label: 'Topics', icon: Layers },
    { to: '/ask', label: 'Ask AI', icon: Bot },
    { to: '/upload', label: 'Upload', icon: UploadCloud },
    { to: '/compare', label: 'Delta Compare', icon: GitCompare },
  ];

  return (
    <>
      <header className="fixed top-2.5 sm:top-3.5 left-1/2 -translate-x-1/2 z-40 w-[96%] max-w-[1560px] rounded-2xl bg-white/80 dark:bg-slate-950/75 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3 shadow-xl dark:shadow-2xl transition-all duration-300">
        
        {/* Left: Brand Logo & Dataset Selector */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <NavLink to="/" className="flex items-center gap-2.5 group shrink-0" title="Voilà Intelligence">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-1 flex items-center justify-center shadow-xs group-hover:scale-105 transition-all">
              <img src="/voila-icon.png" alt="Voilà Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-black text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
                Voilà<span className="text-indigo-600 dark:text-indigo-400 font-extrabold">.ai</span>
              </span>
              <span className="hidden sm:inline px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-[9px] font-mono font-bold text-indigo-700 dark:text-indigo-300">
                v2.4
              </span>
            </div>
          </NavLink>

          {/* Vertical Divider */}
          <div className="hidden sm:block h-5 w-px bg-slate-200 dark:border-white/10 shrink-0" />

          {/* Dataset Switcher Dropdown */}
          <div className="relative min-w-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200/80 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 transition-colors">
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <select
                value={activeRunId || 'all'}
                onChange={(e) => setActiveRunId(e.target.value)}
                className="bg-transparent text-xs font-sans text-slate-800 dark:text-slate-200 font-medium outline-none cursor-pointer pr-1 max-w-[130px] sm:max-w-[200px] md:max-w-[240px] truncate"
                disabled={isLoadingRuns || runs.length === 0}
              >
                <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold">
                  All Datasets ({totalCombinedRecords.toLocaleString()} msgs)
                </option>
                {runs.map((r, idx) => (
                  <option key={r.run_id} value={r.run_id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    Run #{idx + 1} · {r.run_id.slice(0, 8)} ({r.total_records?.toLocaleString() || 0} rows)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dimension Slices Trigger Button */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-sans font-medium transition-colors border cursor-pointer ${
                hasActiveFilters
                  ? 'bg-indigo-50 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-200 border-indigo-300 dark:border-indigo-500/40 shadow-xs'
                  : 'bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-200/80 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden md:inline">
                {filters.company
                  ? `Brand: ${filters.company}`
                  : (filters.product
                    ? `Product: ${filters.product}`
                    : (filters.region
                      ? `Region: ${filters.region}`
                      : 'Slices'))}
              </span>
              <span className="md:hidden">
                {hasActiveFilters ? 'Filtered' : 'Slices'}
              </span>
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              )}
              <ChevronDown className="w-3 h-3 ml-0.5 text-slate-400" />
            </button>

            {/* Filter Slices Modal */}
            <AnimatePresence>
              {showFilterDropdown && (
                <motion.div 
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-2.5 w-80 sm:w-96 p-4 rounded-2xl bg-white dark:bg-slate-950/95 backdrop-blur-2xl text-slate-900 dark:text-white z-50 shadow-2xl border border-slate-200 dark:border-white/15"
                >
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-white/10">
                    <div>
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase block">
                        Filters
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Filter data by company, product, or region
                      </span>
                    </div>
                    <button
                      onClick={() => setShowFilterDropdown(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    {/* Brand Filter */}
                    <div>
                      <label className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1">Company / Brand</label>
                      <input
                        type="text"
                        placeholder="e.g. AmazonHelp, AppleSupport"
                        value={filters.company || ''}
                        onChange={(e) => updateFilter('company', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    {/* Product Filter */}
                    <div>
                      <label className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1">Product Line</label>
                      <input
                        type="text"
                        placeholder="e.g. Prime, iOS, Flight Booking"
                        value={filters.product || ''}
                        onChange={(e) => updateFilter('product', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    {/* Region Filter */}
                    <div>
                      <label className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1">Geographic Region</label>
                      <select
                        value={filters.region || ''}
                        onChange={(e) => updateFilter('region', e.target.value || null)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                      >
                        <option value="" className="bg-white dark:bg-slate-900">All Global Regions</option>
                        <option value="North America" className="bg-white dark:bg-slate-900">North America</option>
                        <option value="Europe" className="bg-white dark:bg-slate-900">Europe</option>
                        <option value="Asia Pacific" className="bg-white dark:bg-slate-900">Asia Pacific</option>
                        <option value="Latin America" className="bg-white dark:bg-slate-900">Latin America</option>
                        <option value="Middle East & Africa" className="bg-white dark:bg-slate-900">Middle East & Africa</option>
                      </select>
                    </div>

                    {hasActiveFilters && (
                      <button
                        onClick={resetFilters}
                        className="w-full py-1.5 text-center text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline pt-2 border-t border-slate-100 dark:border-white/10 cursor-pointer"
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Main Navigation Tabs with Animated Floating Pill */}
        <nav className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                  isActive 
                    ? 'text-indigo-900 dark:text-white font-semibold' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeFloatingPill"
                    className="absolute inset-0 rounded-lg bg-white dark:bg-indigo-600/30 border border-slate-200/80 dark:border-indigo-500/40 shadow-xs"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={`w-3.5 h-3.5 relative z-10 ${isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className="relative z-10">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Right: Quick Action Controls, Theme Toggle & User Account */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Theme Toggle Button (Light/Dark mode) */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={toggleTheme}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200/80 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-colors text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          >
            <AnimatePresence mode="wait">
              {isDark ? (
                <motion.div
                  key="sun"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1.5"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden xl:inline text-[11px]">Light</span>
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1.5"
                >
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden xl:inline text-[11px]">Dark</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Custom Report Studio Trigger */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/[0.05] hover:bg-slate-50 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-colors text-xs font-medium cursor-pointer shadow-2xs"
            title="Open Custom Report Studio"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-500 dark:text-indigo-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Ask AI Primary Button */}
          <button
            onClick={() => navigate('/ask')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all text-xs cursor-pointer shadow-sm"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-200" />
            <span>Ask AI</span>
          </button>

          {/* Logout / User */}
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="lg:hidden p-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Dropdown */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 left-4 right-4 z-40 p-3 rounded-2xl bg-white dark:bg-slate-950/95 backdrop-blur-2xl lg:hidden shadow-2xl border border-slate-200 dark:border-white/15 space-y-1"
          >
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isActive 
                      ? 'bg-indigo-50 dark:bg-indigo-600/30 text-indigo-700 dark:text-white font-semibold border border-indigo-200 dark:border-indigo-500/40' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enterprise Custom Report Studio Modal */}
      <CustomReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </>
  );
}

export default FloatingTopNav;
