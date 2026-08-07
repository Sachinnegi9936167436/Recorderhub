'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@academically.com');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 600);
  };

  const setRoleDemo = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-tr from-brand-600 to-teal-400 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-brand-600/30">
            R
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">RecordHub</h1>
          <p className="text-sm text-slate-400">Academically Global Healthcare Academy</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 text-white font-medium py-2.5 rounded-lg text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-brand-600/20"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Role Demo Quick Switcher */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          <p className="text-xs text-slate-400 font-medium text-center flex items-center justify-center space-x-1">
            <UserCheck className="w-3.5 h-3.5 text-brand-400" />
            <span>Select Demo Role to Quick Login</span>
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => setRoleDemo('admin@academically.com')}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 p-2 rounded text-slate-300 hover:text-white text-left font-medium transition-all"
            >
              👑 Admin
            </button>
            <button
              onClick={() => setRoleDemo('manager@academically.com')}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 p-2 rounded text-slate-300 hover:text-white text-left font-medium transition-all"
            >
              👔 Manager
            </button>
            <button
              onClick={() => setRoleDemo('qa@academically.com')}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 p-2 rounded text-slate-300 hover:text-white text-left font-medium transition-all"
            >
              🎓 QA Trainer
            </button>
            <button
              onClick={() => setRoleDemo('agent@academically.com')}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 p-2 rounded text-slate-300 hover:text-white text-left font-medium transition-all"
            >
              🎧 Sales Counselor
            </button>
          </div>
        </div>

        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-500 flex items-center justify-center space-x-1">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>DPDPA 2023 Compliant • AWS India Region (ap-south-1)</span>
          </p>
        </div>
      </div>
    </div>
  );
}
