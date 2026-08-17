import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Radio, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await register({
        username,
        email,
        full_name: fullName,
        password,
      });
      navigate('/');
    } catch (err) {
      console.error('[Registration failed]:', err);
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        setError('Backend server offline at http://localhost:8000. Start backend with: uvicorn backend.app:app --reload --port 8000');
      } else {
        setError(err.response?.data?.detail || 'Registration failed. User may already exist.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-zinc-100 selection:text-zinc-950">
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto shadow-sm mb-3">
            <Radio className="w-6 h-6 text-zinc-100" />
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-zinc-100 tracking-tight">
            voila<span className="text-zinc-400">.ai</span>
          </h1>
          <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
            Create Analytics Workspace Account
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5">
          <h2 className="font-display font-bold text-base text-zinc-100 pb-3 border-b border-zinc-800">
            User Registration
          </h2>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
            <div>
              <label className="block font-mono text-zinc-400 mb-1 font-medium">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. analyst_sarah"
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-mono text-zinc-400 mb-1 font-medium">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Sarah Connor"
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-mono text-zinc-400 mb-1 font-medium">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@company.com"
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-mono text-zinc-400 mb-1 font-medium">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-sm font-mono text-xs flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
            >
              <span>{isLoading ? 'Creating Account...' : 'Register & Enter Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-3 border-t border-zinc-800 text-center">
            <p className="text-[11px] font-mono text-zinc-400">
              Already have an account?{' '}
              <Link to="/login" className="text-zinc-200 hover:underline font-semibold">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
