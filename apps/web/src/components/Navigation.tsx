'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  BarChart3, 
  PhoneCall, 
  PhoneIncoming, 
  Mic, 
  Users, 
  UserCheck, 
  CreditCard, 
  Puzzle, 
  HeartHandshake, 
  Settings, 
  ChevronDown
} from 'lucide-react';

function NavigationInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'teams';

  const navItems = [
    { name: 'Analytics', href: '/dashboard', icon: BarChart3, hasSub: true },
    { name: 'Calls', href: '/calls', icon: PhoneCall },
    { name: 'Inbound (beta)', href: '/calls?direction=INCOMING', icon: PhoneIncoming, hasSub: true },
    { name: 'Recording', href: '/calls?filter=recordings', icon: Mic },
    { name: 'Team Management', href: '/counselors?view=teams', viewKey: 'teams', icon: Users },
    { name: 'User Management', href: '/counselors?view=users', viewKey: 'users', icon: UserCheck },
    { name: 'Subscription', href: '/settings', icon: CreditCard, hasSub: true },
    { name: 'Integrations', href: '/device-health', icon: Puzzle, hasSub: true },
    { name: 'Referral Program', href: '/settings', icon: HeartHandshake },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 font-sans z-30">
      <div>
        {/* RecorderHub Brand Header */}
        <div className="px-6 py-5 flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20 font-bold text-lg">
            R
          </div>
          <span className="font-bold text-slate-900 text-xl tracking-tight">recorderhub</span>
        </div>

        {/* Navigation List */}
        <nav className="px-3 py-2 space-y-0.5">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            let isActive = false;
            if (item.viewKey) {
              isActive = pathname === '/counselors' && currentView === item.viewKey;
            } else {
              isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            }

            return (
              <Link
                key={idx}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-rose-50 text-rose-600 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-rose-600' : 'text-slate-500'}`} />
                  <span>{item.name}</span>
                </div>
                {item.hasSub && (
                  <ChevronDown className={`w-3.5 h-3.5 ${isActive ? 'text-rose-600' : 'text-slate-400'}`} />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Salestrail Bottom Banner */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-center space-y-1">
          <p className="font-semibold text-slate-800">Academically Global</p>
          <p className="text-[11px] text-slate-500">Organisation ID: 65c1f00</p>
        </div>
      </div>
    </aside>
  );
}

export default function Navigation() {
  return (
    <Suspense fallback={<aside className="w-64 bg-white border-r border-slate-200 h-screen sticky top-0" />}>
      <NavigationInner />
    </Suspense>
  );
}
