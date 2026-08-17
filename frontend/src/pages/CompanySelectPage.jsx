import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import { analyticsApi } from '../api/analytics';
import { useRun } from '../context/RunContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Distinctive color palettes per company card
const COMPANY_COLORS = [
  { bg: 'from-indigo-500/20 via-indigo-600/10 to-transparent', border: 'border-indigo-200 dark:border-indigo-500/30', icon: 'text-indigo-600 dark:text-indigo-400', badge: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300', glow: 'shadow-indigo-500/10' },
  { bg: 'from-violet-500/20 via-purple-600/10 to-transparent', border: 'border-violet-200 dark:border-violet-500/30', icon: 'text-violet-600 dark:text-violet-400', badge: 'bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300', glow: 'shadow-violet-500/10' },
  { bg: 'from-sky-500/20 via-blue-600/10 to-transparent', border: 'border-sky-200 dark:border-sky-500/30', icon: 'text-sky-600 dark:text-sky-400', badge: 'bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300', glow: 'shadow-sky-500/10' },
  { bg: 'from-emerald-500/20 via-teal-600/10 to-transparent', border: 'border-emerald-200 dark:border-emerald-500/30', icon: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', glow: 'shadow-emerald-500/10' },
  { bg: 'from-amber-500/20 via-orange-600/10 to-transparent', border: 'border-amber-200 dark:border-amber-500/30', icon: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300', glow: 'shadow-amber-500/10' },
  { bg: 'from-rose-500/20 via-pink-600/10 to-transparent', border: 'border-rose-200 dark:border-rose-500/30', icon: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300', glow: 'shadow-rose-500/10' },
  { bg: 'from-cyan-500/20 via-sky-600/10 to-transparent', border: 'border-cyan-200 dark:border-cyan-500/30', icon: 'text-cyan-600 dark:text-cyan-400', badge: 'bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300', glow: 'shadow-cyan-500/10' },
  { bg: 'from-fuchsia-500/20 via-purple-600/10 to-transparent', border: 'border-fuchsia-200 dark:border-fuchsia-500/30', icon: 'text-fuchsia-600 dark:text-fuchsia-400', badge: 'bg-fuchsia-50 dark:bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300', glow: 'shadow-fuchsia-500/10' },
];

function getColorForCompany(name, idx) {
  return COMPANY_COLORS[idx % COMPANY_COLORS.length];
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

function truncateTopic(topic, max = 24) {
  if (!topic) return 'General Support';
  const parts = topic.split(',');
  const clean = parts[0].trim();
  return clean.length > max ? clean.slice(0, max) + '…' : clean;
}

function CompanyCard({ company, idx, onSelect, isSelected }) {
  const color = getColorForCompany(company.company, idx);
  const initials = getInitials(company.company);
  const isHighNeg = company.negative_pct > 40;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.3) }}
      onClick={() => onSelect(company.company)}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative w-full text-left rounded-2xl border bg-white dark:bg-slate-900/90 backdrop-blur-md p-3.5 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md ${color.glow} ${
        isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-400/40'
          : `${color.border} hover:border-indigo-400 dark:hover:border-indigo-500/50`
      }`}
    >
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${color.bg} opacity-40 group-hover:opacity-75 transition-opacity pointer-events-none`} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color.bg} border ${color.border} flex items-center justify-center text-xs font-black ${color.icon} shrink-0`}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display font-bold text-xs text-slate-900 dark:text-white leading-tight truncate" title={company.company}>
                {company.company}
              </h3>
              <span className={`text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-full ${color.badge} mt-0.5 inline-block truncate max-w-[140px]`}>
                {truncateTopic(company.top_topic)}
              </span>
            </div>
          </div>
          <div className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 transition-colors">
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-white" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 py-1 px-2 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 text-[10px]">
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">Vol</span>
            <span className="font-bold text-slate-900 dark:text-white leading-tight">
              {Number(company.total_conversations || 0).toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">Friction</span>
            <span className={`font-bold leading-tight ${isHighNeg ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
              {company.negative_pct}%
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">SLA</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 leading-tight">
              {company.avg_response_time > 0 ? `${Math.round(company.avg_response_time)}m` : '<1m'}
            </span>
          </div>
        </div>

        <div className="mt-2">
          <div className="h-1 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex">
            <div className="h-full bg-emerald-500" style={{ width: `${company.positive_pct || 0}%` }} />
            <div className="h-full bg-rose-500" style={{ width: `${company.negative_pct || 0}%` }} />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export function CompanySelectPage() {
  const navigate = useNavigate();
  const { setSelectedCompany, selectedCompany } = useRun();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['companies_list'],
    queryFn: () => analyticsApi.getCompanies(),
    staleTime: 5000,
    refetchOnMount: 'always',
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
    <div className="h-screen max-h-screen w-screen overflow-hidden bg-[#f8fafc] dark:bg-[#07090e] text-slate-900 dark:text-slate-100 flex flex-col relative selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[260px] bg-gradient-to-b from-indigo-500/12 via-purple-500/8 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-20 right-10 w-64 h-64 bg-sky-500/8 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-64 h-64 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ── Compact Header Navbar ── */}
      <header className="w-full px-5 py-2.5 flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md shrink-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-1 flex items-center justify-center shadow-2xs">
            <img src="/voila-icon.png" alt="Voilà Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
                Voilà<span className="text-indigo-600 dark:text-indigo-400">.ai</span>
              </span>
              <span className="px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-mono text-[8px] font-bold border border-indigo-200 dark:border-indigo-500/30">
                v2.4
              </span>
            </div>
            <p className="text-[9px] font-mono text-slate-400 dark:text-slate-500 leading-none">
              Voice-of-Customer Intelligence
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-[10px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            PostgreSQL Node Online
          </div>

          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors text-xs font-medium cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* ── Main Viewport-Fitted Body ── */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-between px-4 py-3 max-w-6xl mx-auto w-full overflow-hidden">
        
        {/* Compact Hero Section Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center shrink-0 mb-2 max-w-xl"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/50 dark:via-purple-950/50 dark:to-pink-950/50 border border-indigo-200/80 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold mb-1.5 shadow-2xs">
            <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
            <span>Welcome back, <strong>{user?.username || 'deepak'}</strong></span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400">Workspace Active</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-1">
            Company Intelligence <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">Hub</span>
          </h1>
          
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
            {hasAnyData
              ? "Select an enterprise brand to analyze customer satisfaction, topic complaint clusters, and SLA response dynamics."
              : "Upload customer conversations from Zendesk, Twitter, or CSV exports to analyze company-level sentiment and topics."}
          </p>

          {/* Quick Stats Strip (when data exists) */}
          {!isLoading && hasAnyData && (
            <div className="inline-flex items-center justify-center gap-4 mt-2 px-4 py-1 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-2xs">
              <div className="text-center">
                <span className="text-xs font-black text-slate-900 dark:text-white">{rawCompanies.length}</span>
                <span className="text-[9px] font-mono uppercase text-slate-400 ml-1">Brands</span>
              </div>
              <div className="w-px h-4 bg-slate-200 dark:bg-white/10" />
              <div className="text-center">
                <span className="text-xs font-black text-slate-900 dark:text-white">{totalConversations.toLocaleString()}</span>
                <span className="text-[9px] font-mono uppercase text-slate-400 ml-1">Msgs</span>
              </div>
              <div className="w-px h-4 bg-slate-200 dark:bg-white/10" />
              <div className="text-center">
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">11+</span>
                <span className="text-[9px] font-mono uppercase text-slate-400 ml-1">Languages</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Search Bar (when companies exist) ── */}
        {!isLoading && rawCompanies.length > 6 && (
          <div className="relative w-full max-w-sm mb-2 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-xs outline-none focus:border-indigo-500 transition-all shadow-2xs"
            />
          </div>
        )}

        {/* ── ZERO STATE: 100% Fitted Non-Scrolling Layout ── */}
        {!isLoading && !hasAnyData && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-3xl flex-1 flex flex-col justify-center gap-3 my-auto"
          >
            {/* Primary Action Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-white via-white/95 to-indigo-50/30 dark:from-slate-900 dark:via-slate-900/95 dark:to-indigo-950/20 border border-slate-200/90 dark:border-white/10 shadow-lg text-center space-y-3 relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-500/25">
                <UploadCloud className="w-6 h-6 animate-bounce" />
              </div>

              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
                  No Support Datasets Ingested Yet
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Upload customer support tickets or conversation logs to unlock automated brand segregation and topic clustering.
                </p>
              </div>

              <button
                onClick={() => navigate('/upload')}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Dataset & Launch Ingestion</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3-Step Feature Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 space-y-1 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="font-display font-bold text-xs text-slate-900 dark:text-white">
                    1. Brand Isolation
                  </h4>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Auto-extracts brands (Apple, Amazon, Uber) from handles & @mentions.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 space-y-1 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="font-display font-bold text-xs text-slate-900 dark:text-white">
                    2. 11+ Language NLP
                  </h4>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Vectorized ISO detection (English, Spanish, Portuguese, French...).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 space-y-1 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="font-display font-bold text-xs text-slate-900 dark:text-white">
                    3. Executive KPIs
                  </h4>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Sub-15ms CSAT, SLA latency & P0-P3 priority triage per brand.
                </p>
              </div>
            </div>

            {/* Supported Integrations Strip */}
            <div className="py-2 px-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Supported:
              </span>
              <span>CSV / Parquet</span>
              <span>·</span>
              <span>Twitter / X</span>
              <span>·</span>
              <span>Zendesk</span>
              <span>·</span>
              <span>Salesforce</span>
              <span>·</span>
              <span>Intercom</span>
            </div>
          </motion.div>
        )}

        {/* ── Active Companies Card Grid (Scrollable inside if many cards) ── */}
        {!isLoading && companies.length > 0 && (
          <div className="flex-1 min-h-0 w-full overflow-y-auto pr-1">
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 w-full"
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

        {/* ── Bottom Strip / View All Combined (when data exists) ── */}
        {!isLoading && hasAnyData && (
          <div className="shrink-0 pt-2 pb-1 flex flex-col items-center gap-1">
            <button
              onClick={handleViewAll}
              className="group flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 hover:border-indigo-400 text-slate-700 dark:text-slate-200 hover:text-indigo-600 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500" />
              <span>View All {rawCompanies.length} Companies Combined</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <p className="text-[9px] font-mono text-slate-400">
              Aggregated across all {totalConversations.toLocaleString()} conversations
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default CompanySelectPage;
