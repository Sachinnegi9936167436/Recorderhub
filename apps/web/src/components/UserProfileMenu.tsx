'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, Building2, Shield, Check, Copy } from 'lucide-react';

export function UserProfileMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userRole, setUserRole] = useState('ADMIN');
  const [userEmail, setUserEmail] = useState('admin@academically.com');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('userRole') || 'ADMIN';
      const storedEmail = localStorage.getItem('userEmail') || 'admin@academically.com';
      setUserRole(storedRole);
      setUserEmail(storedEmail);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('access_token');
    }
    router.push('/');
  };

  const getRoleLabel = (role: string) => {
    switch (role.toUpperCase()) {
      case 'ADMIN':
      case 'COMPANY_ADMIN':
        return 'System Admin';
      case 'MANAGER':
        return 'Manager';
      case 'TEAM_LEAD':
        return 'Team Lead';
      case 'COUNSELOR':
      case 'AGENT':
        return 'Counselor';
      default:
        return role;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role.toUpperCase()) {
      case 'ADMIN':
      case 'COMPANY_ADMIN':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MANAGER':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'TEAM_LEAD':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'COUNSELOR':
      case 'AGENT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getUsername = () => {
    if (userEmail && userEmail.includes('@')) {
      const prefix = userEmail.split('@')[0];
      return prefix
        .replace(/[._]/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
    return 'User';
  };

  const copyOrgId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('65c1f0000000000000000001');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative inline-block text-left z-50" ref={menuRef}>
      {/* Profile Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User profile menu"
        className="w-9 h-9 rounded-full bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-700 shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
      >
        <User className="w-5 h-5 text-slate-600" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 px-3 space-y-3 font-sans animate-in fade-in zoom-in-95 duration-100">
          {/* User Info Header */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 font-bold text-base shrink-0">
              {getUsername().charAt(0)}
            </div>
            <div className="overflow-hidden min-w-0">
              <h4 className="font-bold text-slate-900 text-sm truncate">{getUsername()}</h4>
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>
          </div>

          {/* User Access Level */}
          <div className="space-y-1.5 px-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              User Access Level
            </label>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-800">
                  {getRoleLabel(userRole)}
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(userRole)}`}>
                {userRole}
              </span>
            </div>
          </div>

          {/* Organisation Details */}
          <div className="space-y-1.5 px-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Organisation Info
            </label>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <div className="flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Academically Global</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                <span className="font-mono text-[10px]">ID: 65c1f000...001</span>
                <button
                  onClick={copyOrgId}
                  className="text-rose-600 hover:text-rose-700 font-semibold flex items-center space-x-1 hover:underline cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 text-[10px]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="text-[10px]">Copy ID</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <div className="pt-1 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold px-3 py-2 rounded-xl text-xs transition-colors border border-rose-100 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfileMenu;
