import React from 'react';
import { motion } from 'framer-motion';

export function GlobalLoadingScreen({ 
  message = 'Loading...', 
  subtext = 'Please wait' 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed inset-0 z-[99999] bg-[#f8fafc]/95 dark:bg-[#07090e]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 select-none"
    >
      <div className="relative flex flex-col items-center max-w-sm text-center">
        {/* Logo */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 mb-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-xl flex items-center justify-center overflow-hidden">
          <img 
            src="/voila-icon.png" 
            alt="Voila Logo" 
            className="w-full h-full object-contain p-2" 
          />
        </div>

        {/* Brand & Heading */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="space-y-2"
        >
          <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
            Voila<span className="text-indigo-600 dark:text-indigo-400">.ai</span>
          </h2>
          <p className="font-display font-semibold text-sm text-slate-700 dark:text-slate-300">
            {message}
          </p>
          <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 tracking-wide">
            {subtext}
          </p>
        </motion.div>

        {/* Progress Bar */}
        <div className="w-52 sm:w-64 h-1 bg-slate-200/60 dark:bg-white/[0.06] rounded-full overflow-hidden mt-6 relative">
          <motion.div 
            className="h-full w-20 bg-indigo-600 dark:bg-indigo-400 rounded-full"
            animate={{ x: [-80, 260] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default GlobalLoadingScreen;
