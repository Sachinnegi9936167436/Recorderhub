'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackClientActivity } from '@/lib/activity-tracker';

export function ActivityTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedKeyRef = useRef<string>('');
  const lastTrackedTimeRef = useRef<number>(0);
  const hiddenTimeRef = useRef<number>(0);

  useEffect(() => {
    // Only track if user is logged in
    const email = localStorage.getItem('userEmail');
    if (!email) return;

    const currentKey = `${pathname}?${searchParams.toString()}`;
    const now = Date.now();

    // Prevent duplicate logs within 20 seconds for identical URL
    if (lastTrackedKeyRef.current === currentKey && now - lastTrackedTimeRef.current < 20000) {
      return;
    }

    lastTrackedKeyRef.current = currentKey;
    lastTrackedTimeRef.current = now;

    // Determine action, category, and description based on pathname
    let action = 'PAGE_VIEW';
    let actionCategory: any = 'DASHBOARD';
    let description = 'Opened application page';

    if (pathname === '/dashboard') {
      action = 'OPEN_DASHBOARD';
      actionCategory = 'DASHBOARD';
      description = 'Opened Analytics Dashboard';
    } else if (pathname === '/calls') {
      const isRecordings = searchParams.get('filter') === 'recordings';
      action = isRecordings ? 'VIEW_RECORDINGS' : 'VIEW_CALLS';
      actionCategory = isRecordings ? 'RECORDINGS' : 'CALLS';
      description = isRecordings ? 'Opened Call Recordings' : 'Opened Call Logs';
    } else if (pathname === '/counselors') {
      const view = searchParams.get('view') || 'teams';
      if (view === 'users') {
        action = 'VIEW_USERS';
        actionCategory = 'USER_MANAGEMENT';
        description = 'Opened User Management';
      } else {
        action = 'VIEW_TEAMS';
        actionCategory = 'TEAM_MANAGEMENT';
        description = 'Opened Team Management';
      }
    } else if (pathname === '/settings') {
      action = 'VIEW_SETTINGS';
      actionCategory = 'SETTINGS';
      description = 'Opened Organization Settings';
    } else if (pathname === '/device-health') {
      action = 'VIEW_DEVICE_HEALTH';
      actionCategory = 'SYSTEM';
      description = 'Opened Device Health';
    } else if (pathname === '/activity') {
      action = 'VIEW_AUDIT_LOGS';
      actionCategory = 'SECURITY';
      description = 'Opened Audit & Activity Logs';
    } else if (pathname?.startsWith('/calls/')) {
      action = 'VIEW_CALL_DETAILS';
      actionCategory = 'CALLS';
      description = 'Viewed single call details';
    }

    trackClientActivity({
      action,
      actionCategory,
      description,
      path: currentKey,
      details: {
        pathname,
        queryParams: Object.fromEntries(searchParams.entries()),
      },
    });
  }, [pathname, searchParams]);

  // Track re-opening dashboard session when switching back after > 15 minutes
  useEffect(() => {
    function handleVisibilityChange() {
      const email = localStorage.getItem('userEmail');
      if (!email) return;

      if (document.hidden) {
        hiddenTimeRef.current = Date.now();
      } else {
        const wasHiddenForMs = Date.now() - hiddenTimeRef.current;
        // If tab was idle for > 15 minutes and user returns to dashboard
        if (hiddenTimeRef.current > 0 && wasHiddenForMs > 15 * 60 * 1000) {
          if (pathname === '/dashboard') {
            trackClientActivity({
              action: 'RESUME_DASHBOARD_SESSION',
              actionCategory: 'DASHBOARD',
              description: `Resumed Analytics Dashboard session after ${Math.round(wasHiddenForMs / 60000)}m idle`,
              path: pathname,
            });
          }
        }
        hiddenTimeRef.current = 0;
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pathname]);

  return null;
}

export function ActivityTracker() {
  return (
    <React.Suspense fallback={null}>
      <ActivityTrackerInner />
    </React.Suspense>
  );
}
