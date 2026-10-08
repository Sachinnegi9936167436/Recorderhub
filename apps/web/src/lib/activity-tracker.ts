/**
 * Client-Side Activity Tracker
 * Pure browser-safe utility that sends telemetry to /api/v1/activity
 * Zero Node.js or server-side database dependencies.
 */

export interface ClientActivityPayload {
  sessionId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  action: string;
  actionCategory?: 'DASHBOARD' | 'CALLS' | 'RECORDINGS' | 'AUTH' | 'USER_MANAGEMENT' | 'TEAM_MANAGEMENT' | 'SETTINGS' | 'EXPORTS' | 'GENERAL' | 'SECURITY' | 'SYSTEM';
  description: string;
  targetResource?: string;
  path?: string;
  details?: Record<string, any>;
}

export function startNewSessionId(email: string): string {
  if (typeof window === 'undefined') return '';
  const cleanEmail = (email || 'user').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const sid = `sess_${cleanEmail}_${Date.now()}`;
  try {
    localStorage.setItem('recordhub_session_id', sid);
    sessionStorage.setItem('recordhub_session_id', sid);
  } catch (e) {}
  return sid;
}

export function clearSessionId(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('recordhub_session_id');
    sessionStorage.removeItem('recordhub_session_id');
  } catch (e) {}
}

export function getOrCreateSessionId(email: string): string {
  if (typeof window === 'undefined') return '';
  try {
    let sid = localStorage.getItem('recordhub_session_id') || sessionStorage.getItem('recordhub_session_id');
    if (!sid) {
      sid = startNewSessionId(email);
    } else {
      // Sync across both storage types
      localStorage.setItem('recordhub_session_id', sid);
      sessionStorage.setItem('recordhub_session_id', sid);
    }
    return sid;
  } catch (e) {
    return `sess_${Date.now()}`;
  }
}

export function trackClientActivity(payload: ClientActivityPayload) {
  if (typeof window === 'undefined') return;

  try {
    const email = (payload.userEmail || localStorage.getItem('userEmail') || '').toLowerCase().trim();
    const role = payload.userRole || localStorage.getItem('userRole') || 'COUNSELOR';

    if (!email) return;

    let userName = payload.userName || '';
    if (!userName && email.includes('@')) {
      const prefix = email.split('@')[0];
      userName = prefix
        .replace(/[._]/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    const sessionId = payload.sessionId || getOrCreateSessionId(email);

    const bodyData = {
      ...payload,
      sessionId,
      userEmail: email,
      userName: userName,
      userRole: role,
      path: payload.path || window.location.pathname + window.location.search,
    };

    // If logging out, clear session from storage
    if (payload.action === 'LOGOUT') {
      clearSessionId();
    }

    const endpoint = '/api/v1/activity';
    const jsonString = JSON.stringify(bodyData);

    if (navigator.sendBeacon) {
      const blob = new Blob([jsonString], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
    } else {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonString,
        keepalive: true,
      }).catch(() => {});
    }
  } catch (e) {
    // Fail silently so telemetry never interferes with UI
  }
}
