'use client';

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Mail, Lock } from "lucide-react";

interface LoginFormProps {
  className?: string;
  onLogin?: (credentials: { email: string; pass: string }) => void;
  isLoading?: boolean;
}

export default function LoginForm({ className, onLogin, isLoading }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogin) {
      onLogin({ email, pass: password });
    }
  };

  return (
    <div className={cn("flex min-h-[600px] h-full w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200/80", className)}>
      {/* Left Branding / Image Section */}
      <div className="w-1/2 hidden md:flex relative overflow-hidden bg-slate-900">
        <img
          className="h-full w-full object-cover opacity-90 transition-transform duration-700 hover:scale-105"
          src="https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80"
          alt="RecordHub Secure Login"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent flex flex-col justify-end p-10 text-white">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/90 backdrop-blur-sm flex items-center justify-center font-bold text-2xl mb-4 shadow-lg shadow-indigo-500/30">
            R
          </div>
          <h3 className="text-2xl font-bold tracking-tight">RecordHub Enterprise</h3>
          <p className="text-slate-300 text-xs mt-2 leading-relaxed">
            Academically Global Healthcare Academy • Secure DPDPA-Compliant Call Monitoring Platform
          </p>
        </div>
      </div>

      {/* Right Form Section */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col items-center justify-center">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Sign in</h2>
          <p className="text-xs text-slate-500 mt-2">Welcome back! Please sign in to continue</p>

          {/* Google Auth Button */}
          <button
            type="button"
            className="w-full mt-6 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center h-11 rounded-full text-slate-700 text-xs font-semibold space-x-2 transition-colors shadow-2xs cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          <div className="flex items-center gap-4 w-full my-5">
            <div className="w-full h-px bg-slate-200"></div>
            <p className="text-nowrap text-xs text-slate-400 font-medium">or sign in with email</p>
            <div className="w-full h-px bg-slate-200"></div>
          </div>

          {/* Email Input */}
          <div className="flex items-center w-full bg-slate-50 border border-slate-200 h-11 rounded-full overflow-hidden pl-4 pr-3 gap-2.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@academically.com"
              className="bg-transparent text-slate-800 placeholder-slate-400 outline-none text-xs w-full h-full font-medium"
              required
            />
          </div>

          {/* Password Input */}
          <div className="flex items-center mt-3.5 w-full bg-slate-50 border border-slate-200 h-11 rounded-full overflow-hidden pl-4 pr-3 gap-2.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-transparent text-slate-800 placeholder-slate-400 outline-none text-xs w-full h-full font-medium"
              required
            />
          </div>

          {/* Remember me & Forgot Password */}
          <div className="w-full flex items-center justify-between mt-5 text-slate-500 text-xs">
            <div className="flex items-center gap-2">
              <input
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                type="checkbox"
                id="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label className="text-xs text-slate-600 cursor-pointer font-medium" htmlFor="checkbox">
                Remember me
              </label>
            </div>
            <a className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline font-semibold" href="#">
              Forgot password?
            </a>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 w-full h-11 rounded-full text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] font-bold text-xs transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? "Signing in..." : "Login"}
          </button>

          <p className="text-slate-500 text-xs mt-5">
            Don’t have an account?{" "}
            <a className="text-indigo-600 hover:underline font-semibold" href="#">
              Sign up
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
