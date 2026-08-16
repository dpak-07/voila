import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function GlobalLoadingScreen({ 
  message = 'Loading Intelligence...', 
  subtext = 'Preparing workspace and telemetry diagnostics' 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed inset-0 z-[99999] bg-[#f8fafc]/90 dark:bg-[#07090e]/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 select-none"
    >
      <div className="relative flex flex-col items-center max-w-sm text-center">
        {/* Luminous Logo Container with subtle pulse */}
        <motion.div
          animate={{
            scale: [1, 1.06, 1],
            rotate: [0, 2, -2, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-xl dark:shadow-[0_0_35px_rgba(99,102,241,0.25)] flex items-center justify-center mb-6"
        >
          <img 
            src="/voila-icon.png" 
            alt="Voilà Logo" 
            className="w-full h-full object-contain" 
          />

          {/* Ambient Glow Aura */}
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-blue-500/20 blur-lg -z-10 animate-pulse" />
        </motion.div>

        {/* Brand & Heading */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="space-y-1.5"
        >
          <h2 className="font-display font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight">
            Voilà<span className="text-indigo-600 dark:text-indigo-400">.ai</span>
          </h2>
          <p className="font-display font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            {message}
          </p>
          <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
            {subtext}
          </p>
        </motion.div>

        {/* Minimalist Smooth Infinite Loading Indicator */}
        <div className="w-48 sm:w-56 h-1 bg-slate-200/80 dark:bg-white/10 rounded-full overflow-hidden mt-6 relative">
          <motion.div 
            className="h-full w-24 bg-gradient-to-r from-transparent via-indigo-600 dark:via-indigo-400 to-transparent rounded-full"
            animate={{
              x: [-100, 240],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>

        {/* Status Pill */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20 text-[10px] font-mono font-semibold text-indigo-700 dark:text-indigo-300 shadow-2xs"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-ping" />
          <span>Synchronizing Telemetry</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default GlobalLoadingScreen;
