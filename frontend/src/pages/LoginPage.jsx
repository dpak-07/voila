import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Radio, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      console.error('[Login failed]:', err);
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        setError('Service unavailable. Please try again later.');
      } else {
        setError(err.response?.data?.detail || 'Invalid username or password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-zinc-100 selection:text-zinc-950">
      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center mx-auto p-2.5 shadow-xl mb-3">
            <img src="/voila-icon.png" alt="Voilà Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
            Voilà<span className="text-indigo-400">.ai</span>
          </h1>
          <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
            Voice-of-Customer Signal Intelligence
          </p>
        </div>

        {/* Login Form Card */}
        <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h2 className="font-display font-bold text-base text-zinc-100">Sign In</h2>
            <span className="text-[10px] font-mono text-zinc-300 font-semibold uppercase bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
              JWT Bearer
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
            <div>
              <label className="block font-mono text-zinc-400 mb-1.5 font-medium">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-zinc-400 mb-1.5 font-medium">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 outline-none font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-sm font-mono text-xs flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Helper */}
          <div className="pt-3 border-t border-zinc-800 text-center">
            <p className="text-[11px] font-mono text-zinc-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-zinc-200 hover:underline font-semibold">
                Register New User
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
