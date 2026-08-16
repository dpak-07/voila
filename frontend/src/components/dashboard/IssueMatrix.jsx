import React from 'react';
import { Flame, Repeat, Sparkles, AlertTriangle, TrendingUp } from 'lucide-react';
import { EmptyDiagnostic } from '../common/EmptyDiagnostic';

function getCleanClusterName(item) {
  if (!item) return 'General Support Inquiries';
  if (typeof item === 'string') {
    const kw = item.toLowerCase();
    if (kw.includes('crash') || kw.includes('freeze') || kw.includes('bug') || kw.includes('stability')) return 'App Crashes & System Stability';
    if (kw.includes('delivery') || kw.includes('order') || kw.includes('track') || kw.includes('delay') || kw.includes('shipment')) return 'Delivery, Order Tracking & Delays';
    if (kw.includes('bill') || kw.includes('charge') || kw.includes('invoice') || kw.includes('payment')) return 'Billing, Invoices & Payment Inquiries';
    if (kw.includes('login') || kw.includes('password') || kw.includes('auth') || kw.includes('2fa') || kw.includes('account')) return 'Account Access & Password Authentication';
    if (kw.includes('refund') || kw.includes('cancel') || kw.includes('dispute') || kw.includes('return')) return 'Refunds, Cancellations & Dispute Resolution';
    if (kw.includes('battery') || kw.includes('hardware') || kw.includes('drain')) return 'Hardware & Battery Health Performance';
    if (kw.includes('thank') || kw.includes('help') || kw.includes('praise') || kw.includes('assist')) return 'Customer Service Praise & Quick Help';
    return item.replace(/_/g, ' ');
  }
  if (item.cluster_name && !item.cluster_name.includes(',') && item.cluster_name.length > 3) {
    return item.cluster_name;
  }
  const kw = (item.topic_keywords || item.issue || item.cluster_name || item.name || '').toLowerCase();
  if (kw.includes('crash') || kw.includes('freeze') || kw.includes('bug') || kw.includes('stability')) return 'App Crashes & System Stability';
  if (kw.includes('delivery') || kw.includes('order') || kw.includes('track') || kw.includes('delay') || kw.includes('shipment')) return 'Delivery, Order Tracking & Delays';
  if (kw.includes('bill') || kw.includes('charge') || kw.includes('invoice') || kw.includes('payment')) return 'Billing, Invoices & Payment Inquiries';
  if (kw.includes('login') || kw.includes('password') || kw.includes('auth') || kw.includes('2fa') || kw.includes('account')) return 'Account Access & Password Authentication';
  if (kw.includes('refund') || kw.includes('cancel') || kw.includes('dispute') || kw.includes('return')) return 'Refunds, Cancellations & Dispute Resolution';
  if (kw.includes('battery') || kw.includes('hardware') || kw.includes('drain')) return 'Hardware & Battery Health Performance';
  if (kw.includes('thank') || kw.includes('help') || kw.includes('praise') || kw.includes('assist')) return 'Customer Service Praise & Quick Help';
  return item.cluster_name || item.topic_keywords || item.name || 'General Support Inquiries';
}

export function IssueMatrix({ 
  emergingIssues = [], 
  recurringIssues = [], 
  newIssues = [] 
}) {
  const sections = [
    {
      title: 'Emerging Velocity Spikes',
      badge: 'Spike Anomaly',
      icon: Flame,
      iconBg: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
      badgeBg: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
      cardBorder: 'border-rose-200/80 dark:border-rose-500/30',
      items: Array.isArray(emergingIssues) ? emergingIssues : [],
      emptyMsg: 'No emerging velocity spikes detected (Z <= 2.0).',
    },
    {
      title: 'Recurring Systemic Friction',
      badge: 'Persistent',
      icon: Repeat,
      iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
      badgeBg: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
      cardBorder: 'border-amber-200/80 dark:border-amber-500/30',
      items: Array.isArray(recurringIssues) ? recurringIssues : [],
      emptyMsg: 'No recurring historical themes matched in this run.',
    },
    {
      title: 'New Discovered Issues',
      badge: 'New Surfaced',
      icon: Sparkles,
      iconBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
      badgeBg: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30',
      cardBorder: 'border-indigo-200/80 dark:border-indigo-500/30',
      items: Array.isArray(newIssues) ? newIssues : [],
      emptyMsg: 'No brand-new issue categories surfaced in this upload.',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {sections.map((sec, idx) => {
        const Icon = sec.icon;
        return (
          <div key={idx} className={`p-5 rounded-2xl glass-card flex flex-col justify-between border ${sec.cardBorder} shadow-sm`}>
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-xl ${sec.iconBg} shadow-2xs`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                    {sec.title}
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/10">
                  {sec.items.length}
                </span>
              </div>

              {sec.items.length === 0 ? (
                <div className="py-8 px-4 text-center rounded-2xl bg-white/40 dark:bg-slate-950/40 border border-dashed border-slate-300 dark:border-white/10">
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{sec.emptyMsg}</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sec.items.slice(0, 4).map((item, itemIdx) => {
                    const name = getCleanClusterName(item);
                    const volume = item.volume || item.count || null;
                    const growth = item.growth_rate ?? item.growth ?? null;

                    return (
                      <div
                        key={itemIdx}
                        className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 hover:border-indigo-500/30 transition-colors shadow-xs space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white capitalize leading-snug">
                            {name}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md border text-[9px] font-mono font-bold uppercase shrink-0 ${sec.badgeBg}`}>
                            {sec.badge}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {volume && <span>Vol: <strong className="text-slate-900 dark:text-white">{volume.toLocaleString()}</strong></span>}
                          {growth !== null && (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">+{growth}% velocity</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default IssueMatrix;
