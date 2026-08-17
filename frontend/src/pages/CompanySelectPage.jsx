import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  MessageSquare,
  TrendingDown,
  ArrowRight,
  Search,
  Globe,
  UploadCloud,
  Clock,
  ChevronRight,
  Sparkles,
  Zap,
  LogOut,
  Sun,
  Moon,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { analyticsApi } from '../api/analytics';
import { useRun } from '../context/RunContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Clean, curated enterprise brand color accents
const BRAND_ACCENTS = [
  { avatar: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-500/20', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
  { avatar: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-500/20', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
  { avatar: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200/60 dark:border-violet-500/20', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
  { avatar: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
  { avatar: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-500/20', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
  { avatar: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-500/20', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
];

function getBrandAccent(idx) {
  return BRAND_ACCENTS[idx % BRAND_ACCENTS.length];
}

function getInitials(name) {
  if (!name) return 'CO';
  return name
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || name.slice(0, 2).toUpperCase();
}

function formatEnterpriseTopic(topic) {
  if (!topic) return 'Customer Support & Inquiries';
  const t = topic.toLowerCase();
  if (t.includes('crash') || t.includes('freez') || t.includes('bug') || t.includes('glitch') || t.includes('error')) {
    return 'App Stability & Error Reports';
  }
  if (t.includes('delivery') || t.includes('order') || t.includes('track') || t.includes('shipment') || t.includes('delay')) {
    return 'Delivery & Order Tracking';
  }
  if (t.includes('bill') || t.includes('charge') || t.includes('invoice') || t.includes('payment') || t.includes('subscription')) {
    return 'Billing & Payment Inquiries';
  }
  if (t.includes('login') || t.includes('password') || t.includes('auth') || t.includes('2fa') || t.includes('account')) {
    return 'Account Access & Security';
  }
  if (t.includes('refund') || t.includes('cancel') || t.includes('dispute') || t.includes('return')) {
    return 'Refunds & Dispute Resolution';
  }
  if (t.includes('battery') || t.includes('power') || t.includes('heat') || t.includes('hardware')) {
    return 'Hardware & Device Performance';
  }
  if (t.includes('update') || t.includes('ios') || t.includes('version')) {
    return 'Software & OS Updates';
  }
  if (t.includes('network') || t.includes('wifi') || t.includes('signal') || t.includes('5g')) {
    return 'Connectivity & Network Ops';
  }
  return 'Customer Support & Inquiries';
}

const CompanyCard = React.forwardRef(function CompanyCard({ company, idx, onSelect, isSelected }, ref) {
  const accent = getBrandAccent(idx);
  const initials = getInitials(company.company);
  const isHighNeg = (company.negative_pct || 0) > 35;
  const vol = Number(company.total_conversations || 0);
  const topTopic = formatEnterpriseTopic(company.top_topic);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.25) }}
      onClick={() => onSelect(company.company)}
      className={`group relative text-left rounded-2xl border bg-white dark:bg-slate-900/90 p-5 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 ${
        isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-500/20'
          : 'border-slate-200/90 dark:border-slate-800'
      }`}
    >
      <div className="space-y-4">
        {/* Header: Avatar, Brand Title & Topic Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-xl border flex items-center justify-center text-sm font-bold shrink-0 ${accent.avatar}`}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base text-slate-900 dark:text-white leading-snug truncate" title={company.company}>
                {company.company}
              </h3>
              <div className="mt-1">
                <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[220px]">
                  {topTopic}
                </span>
              </div>
            </div>
          </div>

          <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-colors">
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* 3 Metric Badges */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 text-xs">
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Volume</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              {vol.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Friction</span>
            <span className={`text-sm font-semibold mt-0.5 ${isHighNeg ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
              {company.negative_pct || 0}%
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Mean SLA</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              {company.avg_response_time > 0 ? `${Math.round(company.avg_response_time)}m` : '<1m'}
            </span>
          </div>
        </div>

        {/* Sentiment Distribution Health Bar */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{company.positive_pct || 0}% Positive</span>
            <span className="text-rose-600 dark:text-rose-400 font-medium">{company.negative_pct || 0}% Friction</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${company.positive_pct || 0}%` }} />
            <div className="h-full bg-rose-500 transition-all" style={{ width: `${company.negative_pct || 0}%` }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export function CompanySelectPage() {
  const navigate = useNavigate();
  const { setSelectedCompany, selectedCompany } = useRun();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState('');

  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['companies_list'],
    queryFn: () => analyticsApi.getCompanies(),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: (query) => (query.state.data?.companies?.length ? false : 2500),
  });

  const rawCompanies = useMemo(() => {
    return Array.isArray(data?.companies) ? data.companies : [];
  }, [data]);

  const hasAnyData = rawCompanies.length > 0;

  const companies = useMemo(() => {
    if (!search.trim()) return rawCompanies;
    return rawCompanies.filter((c) =>
      c.company.toLowerCase().includes(search.toLowerCase())
    );
  }, [rawCompanies, search]);

  const totalConversations = useMemo(() => {
    return rawCompanies.reduce((sum, c) => sum + (c.total_conversations || 0), 0);
  }, [rawCompanies]);

  const handleSelectCompany = (company) => {
    setSelectedCompany(company);
    navigate('/dashboard');
  };

  const handleViewAll = () => {
    setSelectedCompany(null);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-[#07090e] text-slate-900 dark:text-slate-100 flex flex-col relative selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[360px] bg-gradient-to-b from-indigo-500/15 via-purple-500/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-20 right-10 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ── Header Navbar ── */}
      <header className="w-full px-6 py-3.5 flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 p-1.5 flex items-center justify-center shadow-xs">
            <img src="/voila-icon.png" alt="Voilà Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-base tracking-tight text-slate-900 dark:text-white">
                Voilà<span className="text-indigo-600 dark:text-indigo-400">.ai</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-mono text-[9px] font-bold border border-indigo-200 dark:border-indigo-500/30">
                v2.4
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 leading-none">
              Voice-of-Customer Intelligence
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            PostgreSQL Node Online
          </div>

          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['companies_list'] });
              refetch();
            }}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-xs font-semibold cursor-pointer"
            title="Refresh Company Directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600' : ''}`} />
            <span className="hidden sm:inline">{isFetching ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Dataset</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors text-xs font-medium cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* ── Main Spacious Body ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col items-center">
        
        {/* Spacious Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="text-center mb-8 max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium mb-3 border border-slate-200/80 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Workspace: <strong>{user?.username || 'deepak'}</strong></span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight mb-2">
            Company Intelligence Directory
          </h1>
          
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mx-auto">
            {hasAnyData
              ? "Select an enterprise brand to inspect real-time customer sentiment, SLA resolution metrics, and topic clusters."
              : "Upload customer conversations from Zendesk, Twitter, or CSV exports to analyze company-level sentiment and topics."}
          </p>

          {/* Quick Stats Strip */}
          {!isLoading && hasAnyData && (
            <div className="inline-flex items-center justify-center gap-6 mt-4 px-5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="text-center">
                <span className="text-sm font-bold text-slate-900 dark:text-white">{rawCompanies.length}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 ml-1.5 font-medium">Brands</span>
              </div>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />
              <div className="text-center">
                <span className="text-sm font-bold text-slate-900 dark:text-white">{totalConversations.toLocaleString()}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 ml-1.5 font-medium">Conversations</span>
              </div>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />
              <div className="text-center">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">11+</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 ml-1.5 font-medium">Languages</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Top Action Toolbar: Search + Clean "View All" Button ── */}
        {!isLoading && hasAnyData && (
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search brands..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all shadow-xs"
              />
            </div>

            {/* Prominent View All Combined Top Action */}
            <button
              onClick={handleViewAll}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Globe className="w-3.5 h-3.5 opacity-80" />
              <span>View All {rawCompanies.length} Brands Combined</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        )}

        {/* ── ZERO STATE ── */}
        {!isLoading && !hasAnyData && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-3xl flex flex-col justify-center gap-6 my-auto"
          >
            <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-white via-white/95 to-indigo-50/30 dark:from-slate-900 dark:via-slate-900/95 dark:to-indigo-950/20 border border-slate-200/90 dark:border-white/10 shadow-xl text-center space-y-4 relative overflow-hidden">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30">
                <UploadCloud className="w-8 h-8 animate-bounce" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="font-display font-black text-xl text-slate-900 dark:text-white tracking-tight">
                  No Support Datasets Ingested Yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Upload customer support tickets or conversation logs to unlock automated brand segregation, topic clustering, and SLA intelligence.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => navigate('/upload')}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Dataset & Launch Ingestion</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['companies_list'] });
                    refetch();
                  }}
                  disabled={isFetching}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600' : ''}`} />
                  <span>{isFetching ? 'Checking Database...' : 'Refresh Directory'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Active Companies Card Grid: Spacious 3-Column Layout ── */}
        {!isLoading && companies.length > 0 && (
          <div className="w-full mb-10">
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full"
            >
              <AnimatePresence mode="popLayout">
                {companies.map((company, idx) => (
                  <CompanyCard
                    key={company.company}
                    company={company}
                    idx={idx}
                    onSelect={handleSelectCompany}
                    isSelected={selectedCompany === company.company}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        )}

        {/* ── View All Combined Button ── */}
        {!isLoading && hasAnyData && (
          <div className="mt-4 pb-12 flex flex-col items-center gap-2">
            <button
              onClick={handleViewAll}
              className="group flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 hover:border-indigo-400 text-slate-700 dark:text-slate-200 hover:text-indigo-600 text-sm font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <Globe className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span>View All {rawCompanies.length} Companies Combined</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-xs font-mono text-slate-400">
              Aggregated multi-brand telemetry across {totalConversations.toLocaleString()} interactions
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default CompanySelectPage;
