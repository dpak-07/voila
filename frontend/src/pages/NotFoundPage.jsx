import React from 'react';
import { Link } from 'react-router-dom';
import { Radio, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-4 shadow-lg">
        <Radio className="w-7 h-7 text-indigo-400" />
      </div>
      <h1 className="font-display font-extrabold text-5xl text-white mb-2 tracking-tight">404</h1>
      <p className="font-mono text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
        The requested telemetry endpoint or route does not exist in the Voila workspace.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-mono text-xs font-bold hover:bg-indigo-500 shadow-md transition-all cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Dashboard
      </Link>
    </div>
  );
}

export default NotFoundPage;
