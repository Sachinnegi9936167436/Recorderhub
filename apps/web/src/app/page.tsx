'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@academically.com');
  const [password, setPassword] = useState('Academically@01');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const demoAccounts = [
    { label: '👑 Admin', email: 'admin@academically.com', pass: 'Academically@01' },
    { label: '💼 Manager', email: 'manager@academically.com', pass: 'Academically@01' },
    { label: '👔 Team Lead', email: 'sachinnegi@academically.com', pass: 'Academically@01' },
    { label: '🎧 Sales User', email: 'shrishtik@academically.com', pass: 'Academically@01' },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(data.message || 'Invalid email or password. Please verify your credentials.');
        setLoading(false);
        return;
      }

      // Success: Save user profile & token to localStorage
      const user = data.user || {};
      const userRole = user.role || 'ADMIN';
      const userEmail = user.email || email.trim();

      if (typeof window !== 'undefined') {
        localStorage.setItem('userRole', userRole);
        localStorage.setItem('userEmail', userEmail);
        if (data.accessToken) {
          localStorage.setItem('access_token', data.accessToken);
        }
      }

      setSuccessMessage(`Authenticated as ${userRole}! Redirecting...`);

      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (err: any) {
      console.error('Login request failed:', err);
      setErrorMessage('Network error during authentication. Please try again.');
      setLoading(false);
    }
  };

  const selectAccount = (acc: { email: string; pass: string }) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setErrorMessage(null);
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

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-xl text-xs flex items-start space-x-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3.5 rounded-xl text-xs flex items-center space-x-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Quick Role Fillers */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Sign In Profiles</label>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((acc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectAccount(acc)}
                className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition-all font-medium flex items-center justify-between ${
                  email === acc.email
                    ? 'bg-brand-500/20 border-brand-500/50 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span>{acc.label}</span>
                <span className="text-[10px] opacity-60 font-mono">Fill</span>
              </button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Work Email (User ID)</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="name@academically.com"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="••••••••"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-10 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 text-white font-semibold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-brand-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loading ? 'Verifying Credentials...' : 'Sign In to Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

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
