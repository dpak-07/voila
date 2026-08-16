import React, { useState, useEffect } from 'react';
import { Activity, Database, Cpu, Sparkles, Layers } from 'lucide-react';

export function GlobalLoadingScreen({ message = 'Synthesizing Signal Intelligence...', subtext = 'Querying high-throughput PostgreSQL engine' }) {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { icon: Database, label: 'Reading PostgreSQL conversation partitions...' },
    { icon: Cpu, label: 'Computing BERTopic semantic vectors & sentiment scores...' },
    { icon: Layers, label: 'Evaluating period-over-period SLA & FCR variances...' },
    { icon: Sparkles, label: 'Synthesizing executive root cause diagnostics...' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden">
        {/* Glowing gradient background aura */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />

        {/* Central Pulse Radar */}
        <div className="relative mx-auto w-20 h-20 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full border border-indigo-400/40 animate-spin" style={{ animationDuration: '6s' }} />
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/50">
            <Activity className="w-6 h-6 text-white animate-pulse" />
          </div>
        </div>

        {/* Title & Subtext */}
        <h3 className="font-display font-bold text-lg text-white tracking-tight mb-1">
          {message}
        </h3>
        <p className="text-xs font-mono text-slate-400 mb-6">
          {subtext}
        </p>

        {/* Dynamic Telemetry Steps */}
        <div className="space-y-2 text-left bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 font-mono text-xs">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCurrent = idx === activeStep;
            const isDone = idx < activeStep;

            return (
              <div 
                key={idx} 
                className={`flex items-center gap-3 transition-all duration-300 ${
                  isCurrent ? 'text-indigo-400 font-semibold scale-[1.01]' : isDone ? 'text-slate-500' : 'text-slate-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                  isCurrent ? 'bg-indigo-500/20 border border-indigo-500/50' : 'bg-slate-800/50'
                }`}>
                  <Icon className={`w-3 h-3 ${isCurrent ? 'text-indigo-400 animate-spin' : 'text-slate-500'}`} />
                </div>
                <span className="truncate text-[11px]">{step.label}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] font-mono text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>PostgreSQL Cluster Online · Sub-15ms In-Memory Cache</span>
        </div>
      </div>
    </div>
  );
}
