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
    <div className={cn("w-full max-w-md mx-auto bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200/80 p-8 sm:p-10", className)}>
      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-2xl text-white mb-4 shadow-lg shadow-indigo-500/30">
          R
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Sign in</h2>
        <p className="text-xs text-slate-500 mt-2 mb-6">Welcome back! Please sign in to continue</p>

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

        {/* Remember me */}
        <div className="w-full flex items-center justify-start mt-4 text-slate-500 text-xs">
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
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="mt-6 w-full h-11 rounded-full text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] font-bold text-xs transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
