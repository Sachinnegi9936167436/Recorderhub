import { connectToDatabase } from '@/lib/db';
import { AuditLogModel } from '@/lib/models';

export interface ActivityPayload {
  userEmail?: string;
  userName?: string;
  userRole?: string;
  userId?: string;
  action: string;
  actionCategory?: 'DASHBOARD' | 'CALLS' | 'RECORDINGS' | 'AUTH' | 'USER_MANAGEMENT' | 'TEAM_MANAGEMENT' | 'SETTINGS' | 'EXPORTS' | 'GENERAL' | 'SECURITY' | 'SYSTEM';
  description: string;
  targetResource?: string;
  path?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  timestamp?: Date;
}

export function parseDevice(ua: string = ''): string {
  if (!ua) return 'Desktop Web';
  
  // Detect OS
  let os = 'Unknown OS';
  if (/windows phone/i.test(ua)) os = 'Windows Phone';
  else if (/win64|wow64|win32|windows/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/ipad|iphone|ipod/i.test(ua)) os = 'iOS';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/cros/i.test(ua)) os = 'ChromeOS';

  // Detect Browser
  let browser = 'Browser';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  return `${browser} • ${os}`;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const list = forwarded.split(',');
    return list[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  return '127.0.0.1';
}

/**
 * Server-side helper to record an activity log in MongoDB Atlas
 */
export async function recordServerActivity(payload: ActivityPayload) {
  try {
    await connectToDatabase();
    const doc = {
      organizationId: '65c1f0000000000000000001',
      actorUserId: payload.userId || '',
      userEmail: (payload.userEmail || 'unknown@academically.com').toLowerCase().trim(),
      userName: payload.userName || '',
      userRole: payload.userRole || 'COUNSELOR',
      action: payload.action,
      actionCategory: payload.actionCategory || 'GENERAL',
      description: payload.description,
      targetResource: payload.targetResource || 'SYSTEM',
      path: payload.path || '/',
      details: payload.details || {},
      ipAddress: payload.ipAddress || '127.0.0.1',
      userAgent: payload.userAgent || '',
      device: payload.device || parseDevice(payload.userAgent),
      timestamp: payload.timestamp || new Date(),
    };

    return await (AuditLogModel as any).create(doc);
  } catch (err) {
    console.warn('[ActivityLogger] Error saving server activity:', err);
    return null;
  }
}
