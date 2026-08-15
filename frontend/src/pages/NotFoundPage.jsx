import React from 'react';
import { Link } from 'react-router-dom';
import { Radio, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-void-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-signal-emerald/10 border border-signal-emerald/40 flex items-center justify-center mb-4">
        <Radio className="w-6 h-6 text-signal-emerald" />
      </div>
      <h1 className="font-display font-bold text-4xl text-slate-100 mb-2">404</h1>
      <p className="font-mono text-xs text-slate-400 max-w-sm mb-6">
        The requested telemetry endpoint or route does not exist in the Voila workspace.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-signal-emerald text-void-950 font-mono text-xs font-bold hover:bg-signal-glow transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Dashboard
      </Link>
    </div>
  );
}

export default NotFoundPage;
