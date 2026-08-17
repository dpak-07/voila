import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary Caught]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const errMsg = this.state.error?.message || 'Unknown error';
      const errStack = this.state.error?.stack || '';
      const componentStack = this.state.errorInfo?.componentStack || '';

      return (
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
          <div className="max-w-2xl w-full space-y-4">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30">
              <h2 className="text-lg font-bold text-rose-400">Something crashed</h2>
              <p className="text-sm text-rose-300 mt-1 font-mono">{errMsg}</p>
            </div>
            <details className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400 max-h-96 overflow-auto">
              <summary className="cursor-pointer text-zinc-300 font-bold mb-2">Stack Trace</summary>
              <pre className="whitespace-pre-wrap">{errStack}</pre>
              {componentStack && (
                <>
                  <hr className="border-zinc-800 my-3" />
                  <pre className="whitespace-pre-wrap">{componentStack}</pre>
                </>
              )}
            </details>
            <button
              onClick={() => { this.setState({ hasError: false, error: null, errorInfo: null }); window.location.href = '/'; }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm cursor-pointer"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
