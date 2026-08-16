import React from 'react';
import { motion } from 'framer-motion';

export function LoadingSkeleton({ rows = 3, height = "h-16", className = "" }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`${height} w-full rounded-2xl glass-card relative overflow-hidden`}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: 'easeInOut',
              delay: i * 0.1,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-12"
    >
      {/* Header Skeleton */}
      <div className="space-y-3 pb-3 border-b border-white/10">
        <div className="flex justify-between items-center">
          <div className="h-8 w-64 rounded-xl bg-white/10 relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            />
          </div>
          <div className="h-8 w-48 rounded-xl bg-white/5 relative overflow-hidden" />
        </div>
        <div className="h-4 w-96 rounded bg-white/5" />
      </div>

      {/* 6 Top Metric KPI Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div 
            key={i} 
            className="h-28 rounded-2xl glass-card p-4 relative overflow-hidden space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-white/10 rounded" />
              <div className="w-6 h-6 rounded-xl bg-white/10" />
            </div>
            <div className="h-7 w-20 bg-white/15 rounded-lg relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut', delay: i * 0.08 }}
              />
            </div>
            <div className="h-2.5 w-14 bg-white/5 rounded" />
          </div>
        ))}
      </div>

      {/* 2 Big Chart Cards Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 h-80 rounded-2xl glass-card p-5 relative overflow-hidden">
          <div className="h-4 w-44 bg-white/10 rounded mb-4" />
          <div className="h-60 w-full bg-white/[0.03] rounded-xl relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            />
          </div>
        </div>

        <div className="lg:col-span-4 h-80 rounded-2xl glass-card p-5 relative overflow-hidden">
          <div className="h-4 w-36 bg-white/10 rounded mb-4" />
          <div className="h-60 w-full bg-white/[0.03] rounded-xl relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut', delay: 0.2 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default LoadingSkeleton;
