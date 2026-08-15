import React from 'react';
import { motion } from 'framer-motion';

export function LoadingSkeleton({ rows = 3, height = "h-16", className = "" }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`${height} w-full rounded-xl bg-void-800/60 border border-slate-800/60 relative overflow-hidden`}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/20 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.6,
              ease: 'easeInOut',
              delay: i * 0.15,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default LoadingSkeleton;
