import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          let border = 'border-blue-500/30 bg-slate-900/95';
          let icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;

          if (toast.type === 'success') {
            border = 'border-emerald-500/30 bg-slate-900/95';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
          } else if (toast.type === 'error') {
            border = 'border-rose-500/30 bg-slate-900/95';
            icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
          } else if (toast.type === 'warning') {
            border = 'border-amber-500/30 bg-slate-900/95';
            icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto p-4 rounded-xl border shadow-xl backdrop-blur-md flex items-start gap-3 text-slate-100 ${border}`}
            >
              {icon}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white">{toast.title}</h4>
                {toast.message && <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
