import React from 'react';
import { motion } from 'framer-motion';

export function GlobalLoadingScreen({ 
  message = 'Loading Intelligence...', 
  subtext = 'Preparing workspace and telemetry diagnostics' 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed inset-0 z-[99999] bg-[#f8fafc]/95 dark:bg-[#07090e]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 select-none"
    >
      {/* Ambient Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/[0.06] dark:bg-indigo-500/[0.08] rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ x: [0, -25, 0], y: [0, 15, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/[0.05] dark:bg-violet-500/[0.07] rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, 10, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-1/2 right-1/3 w-64 h-64 bg-blue-500/[0.04] dark:bg-blue-500/[0.06] rounded-full blur-[80px]"
        />
      </div>

      <div className="relative flex flex-col items-center max-w-sm text-center">
        {/* Orbiting Ring + Logo */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 mb-8">
          {/* Outer Orbit Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.5)]" />
          </motion.div>

          {/* Orbit Path */}
          <div className="absolute inset-2 rounded-full border border-slate-200/40 dark:border-white/[0.06]" />

          {/* Pulsing Glow Ring */}
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-3 rounded-full border-2 border-indigo-500/20 dark:border-indigo-400/15"
          />

          {/* Logo Container */}
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-3 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-xl dark:shadow-[0_0_40px_rgba(99,102,241,0.2)] flex items-center justify-center overflow-hidden"
          >
            <img 
              src="/voila-icon.png" 
              alt="Voilà Logo" 
              className="w-full h-full object-contain p-2" 
            />
            {/* Inner gradient sheen */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.04] via-transparent to-violet-500/[0.04] pointer-events-none" />
          </motion.div>

          {/* Ambient Glow Aura */}
          <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-indigo-500/15 via-purple-500/10 to-blue-500/15 blur-xl -z-10 animate-pulse" />
        </div>

        {/* Brand & Heading */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="space-y-2"
        >
          <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
            Voilà<span className="text-indigo-600 dark:text-indigo-400">.ai</span>
          </h2>
          <p className="font-display font-semibold text-sm text-slate-700 dark:text-slate-300">
            {message}
          </p>
          <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 tracking-wide">
            {subtext}
          </p>
        </motion.div>

        {/* Animated Progress Dots */}
        <div className="flex items-center gap-2 mt-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.2,
              }}
              className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400"
            />
          ))}
        </div>

        {/* Smooth Progress Bar */}
        <div className="w-52 sm:w-64 h-1 bg-slate-200/60 dark:bg-white/[0.06] rounded-full overflow-hidden mt-4 relative">
          <motion.div 
            className="h-full w-20 bg-gradient-to-r from-transparent via-indigo-600 dark:via-indigo-400 to-transparent rounded-full"
            animate={{ x: [-80, 260] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Status Pill */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-50/80 dark:bg-indigo-500/[0.08] border border-indigo-200/50 dark:border-indigo-500/20 text-[10px] font-mono font-semibold text-indigo-700 dark:text-indigo-300 shadow-xs"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-ping" />
          <span>Synchronizing Telemetry</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default GlobalLoadingScreen;
