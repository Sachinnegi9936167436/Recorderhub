'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PhoneCall, Smartphone, Settings, ShieldCheck, Activity, LogOut, Users } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Executive Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Calls Explorer', href: '/calls', icon: PhoneCall },
    { name: 'Counselors Directory', href: '/counselors', icon: Users },
    { name: 'Device Health', href: '/device-health', icon: Smartphone },
    { name: 'Settings & Policy', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-brand-600/20 font-bold text-xl">
            R
          </div>
          <div>
            <h1 className="font-bold text-white tracking-wide text-lg leading-tight">RecordHub</h1>
            <p className="text-[11px] text-teal-400 font-medium tracking-tight">Academically Global</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600/10 text-brand-400 border border-brand-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* System Status & Profile */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60 text-xs">
          <div className="flex items-center space-x-2 text-emerald-400 font-medium">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Sync Engine Active</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Tenant: Academically India</p>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200">
              DA
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Dr. Akram Ahmad</p>
              <p className="text-[10px] text-slate-400">Company Admin</p>
            </div>
          </div>
          <Link href="/" className="text-slate-400 hover:text-red-400 transition-colors p-1.5 rounded-md hover:bg-slate-800">
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
