'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
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
  const { role, email: userEmail, isAdmin, isSuperAdmin, isCounselor, mounted } = useUserRole();

  const navItems = [
    { name: 'Analytics', href: '/dashboard', icon: BarChart3, hasSub: true },
    { name: 'Calls', href: '/calls', icon: PhoneCall },
    { name: 'Recording', href: '/calls?filter=recordings', icon: Mic },
    ...(mounted && !isCounselor ? [
      { name: 'Team Management', href: '/counselors?view=teams', viewKey: 'teams', icon: Users },
    ] : []),
    ...(mounted && (isAdmin || isSuperAdmin) ? [
      { name: 'User Management', href: '/counselors?view=users', viewKey: 'users', icon: UserCheck },
      { name: 'Settings', href: '/settings', icon: Settings },
    ] : []),
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
    </aside>
  );
}

let cachedCounselorList: any[] | null = null;
let lastCounselorFetchTs = 0;
let activeCounselorFetchPromise: Promise<any[]> | null = null;

async function getCachedCounselorList(): Promise<any[]> {
  const now = Date.now();
  if (cachedCounselorList && (now - lastCounselorFetchTs < 60000)) {
    return cachedCounselorList;
  }
  if (activeCounselorFetchPromise) {
    return activeCounselorFetchPromise;
  }
  activeCounselorFetchPromise = fetch('/api/v1/auth/counselors')
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data)) {
        cachedCounselorList = data;
        lastCounselorFetchTs = Date.now();
      }
      activeCounselorFetchPromise = null;
      return data;
    })
    .catch(() => {
      activeCounselorFetchPromise = null;
      return cachedCounselorList || [];
    });
  return activeCounselorFetchPromise;
}

export function useUserRole() {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [role, setRole] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setMounted(true);
    const storedRole = localStorage.getItem('userRole');
    const storedEmail = localStorage.getItem('userEmail');

    if (!storedRole || !storedEmail) {
      setRole('');
      setEmail('');
      setIsLoading(false);
      // Clear any orphaned cookies
      document.cookie = 'recordhub_session=; path=/; max-age=0; SameSite=Lax';
      router.replace('/');
      return;
    }

    setRole(storedRole);
    setEmail(storedEmail);
    setIsLoading(false);

    // Refresh role from server in background with request deduplication
    getCachedCounselorList()
      .then((users) => {
        if (Array.isArray(users)) {
          const current = users.find((u: any) => (u.email || '').toLowerCase() === storedEmail.toLowerCase());
          if (current && current.role && current.role !== storedRole) {
            setRole(current.role);
            localStorage.setItem('userRole', current.role);
          }
        }
      })
      .catch(() => {});
  }, [router]);

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN' || role === 'COMPANY_ADMIN';
  const isManager = role === 'MANAGER';
  const isTeamLead = role === 'TEAM_LEAD';
  const isCounselor = role === 'COUNSELOR' || role === 'AGENT' || role === 'SALES_AGENT' || role === 'SALES';
  const isAuthenticated = Boolean(email && role);

  return { role, email, isSuperAdmin, isAdmin, isManager, isTeamLead, isCounselor, isAuthenticated, isLoading, mounted };
}

export function Navigation() {
  return (
    <Suspense fallback={<aside className="w-64 bg-white border-r border-slate-200 h-screen sticky top-0" />}>
      <NavigationInner />
    </Suspense>
  );
}

export default Navigation;
