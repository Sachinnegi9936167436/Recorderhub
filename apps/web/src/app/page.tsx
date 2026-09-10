'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import LoginForm from '@/components/ui/login-form';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async ({ email, pass }: { email: string; pass: string }) => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: pass.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(data.message || 'Invalid username/password');
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-8 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-4xl relative z-10 space-y-4">
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

        {/* Embedded shadcn LoginForm Component */}
        <LoginForm onLogin={handleLogin} isLoading={loading} />

        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-500 flex items-center justify-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>DPDPA 2023 Compliant • AWS India Region (ap-south-1) • RecordHub Enterprise</span>
          </p>
        </div>
      </div>
    </div>
  );
}
