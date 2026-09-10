'use client';

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface DemoLoginProps {
  className?: string;
  onLogin?: (credentials: { email: string; pass: string }) => void;
}

export default function DemoLogin({ className, onLogin }: DemoLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogin) {
      onLogin({ email, pass: password });
    }
  };

  return (
    <div
      className={cn(
        "bg-white text-slate-600 max-w-sm w-full mx-auto md:p-8 p-6 text-left text-xs rounded-2xl shadow-xl border border-slate-200/80",
        className
      )}
    >
      <div className="text-center mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-lg mx-auto flex items-center justify-center mb-3 shadow-md shadow-indigo-600/20">
          R
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
        <p className="text-slate-400 text-xs mt-1">Please enter your credentials to log in</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full bg-slate-50 border border-slate-200 outline-none rounded-full py-2.5 px-4 text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
            required
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full bg-slate-50 border border-slate-200 outline-none rounded-full py-2.5 px-4 text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
            required
          />
        </div>

        <div className="text-right pt-1">
          <a className="text-indigo-600 hover:text-indigo-700 underline text-xs font-semibold" href="#">
            Forgot Password?
          </a>
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] py-2.5 rounded-full text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          Log in
        </button>
      </form>

      <p className="text-center text-slate-500 text-xs mt-4">
        Don’t have an account?{" "}
        <a href="#" className="text-indigo-600 font-semibold hover:underline">
          Signup
        </a>
      </p>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-slate-400 text-[11px]">Or continue with</span>
        </div>
      </div>

      <button
        type="button"
        className="w-full flex items-center gap-2 justify-center bg-slate-950 hover:bg-slate-900 py-2.5 rounded-full text-white text-xs font-semibold transition-all shadow-2xs cursor-pointer"
      >
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 170 170">
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.6-7.85-11.75-14.44-6.85-10.88-12.2-22.9-16.03-36.08-3.83-13.18-5.74-25.75-5.74-37.72 0-14.78 3.82-27.14 11.45-37.07 7.64-9.93 17.1-14.94 28.4-15.04 4.58 0 9.87 1.25 15.86 3.75 5.99 2.5 9.78 3.78 11.38 3.83 1.2.05 5.21-1.25 12.03-3.9 6.82-2.65 12.53-3.83 17.13-3.55 12.82.78 23.1 5.38 30.85 13.82-11.4 6.87-17.03 16.48-16.88 28.84.15 10.3 4.15 19.03 12 26.2 3.88 3.65 8.35 6.38 13.4 8.2-2.8 8.08-6.4 16.08-10.8 24.03zM119.22 31.84c0-7.23 2.65-14.13 7.95-20.7 5.3-6.57 11.83-10.63 19.58-12.18.3 1.5.45 2.95.45 4.35 0 7.4-2.82 14.62-8.47 21.65-5.65 7.03-12.15 11.03-19.51 12-.13-1.6-.2-3.32-.2-5.12z" />
        </svg>
        <span>Log in with Apple</span>
      </button>

      <button
        type="button"
        className="w-full flex items-center gap-2 justify-center my-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 py-2.5 rounded-full text-slate-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
        <span>Log in with Google</span>
      </button>
    </div>
  );
}
