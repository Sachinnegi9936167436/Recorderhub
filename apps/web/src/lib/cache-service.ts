import { cacheGet, cacheSet, cacheDel } from './redis';
import { connectToDatabase, withDbRetry } from './db';
import { CallModel, DeviceModel, UserModel, TeamModel } from './models';

export const CALLS_CACHE_KEY = 'cache:calls:latest';
export const CALLS_CACHE_TTL = 86400; // 24 hours

export const COUNSELORS_CACHE_KEY = 'cache:auth:counselors';
export const COUNSELORS_CACHE_TTL = 3600; // 1 hour

export const TEAMS_CACHE_KEY = 'cache:teams:list';
export const TEAMS_CACHE_TTL = 3600; // 1 hour

export const DASHBOARD_SUMMARY_CACHE_KEY = 'cache:dashboard:summary';
export const DASHBOARD_SUMMARY_CACHE_TTL = 86400; // 24 hours

let isRebuildingCalls = false;
let lastRebuildTimestamp = 0;
const MIN_REBUILD_INTERVAL_MS = 120000; // Throttle full rebuilds to at most once per 2 minutes

/**
 * Normalizes and formats domestic and international phone numbers, preserving their true country code:
 * - Pakistan (+92): "+92 313 2323522"
 * - India (+91): "+91 98765 43210"
 * - USA/Canada (+1): "+1 212 555 1234"
 * - UK (+44): "+44 7911 123456"
 * - UAE (+971): "+971 50 1234567"
 * - Saudi (+966): "+966 50 1234567"
 */
export function formatPhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  const trimmed = rawPhone.trim();

  // If it's a contact name with words and no '+', return it
  if (/[a-zA-Z]/.test(trimmed) && !trimmed.startsWith('+')) {
    return trimmed;
  }

  // 1. Explicit '+' country code prefix
  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.startsWith('92') && digits.length === 12) {
      return `+92 ${digits.slice(2, 5)} ${digits.slice(5)}`;
    }
    if (digits.startsWith('91') && digits.length === 12) {
      return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    if (digits.startsWith('1') && digits.length === 11) {
      return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    if (digits.startsWith('44') && digits.length >= 12) {
      return `+44 ${digits.slice(2, 6)} ${digits.slice(6)}`;
    }
    if (digits.startsWith('971') && digits.length >= 11) {
      return `+971 ${digits.slice(3, 5)} ${digits.slice(5)}`;
    }
    if (digits.startsWith('966') && digits.length >= 11) {
      return `+966 ${digits.slice(3, 5)} ${digits.slice(5)}`;
    }
    if (digits.startsWith('61') && digits.length >= 11) {
      return `+61 ${digits.slice(2, 5)} ${digits.slice(5)}`;
    }
    return `+${digits}`;
  }

  const digitsOnly = trimmed.replace(/\D/g, '');

  // 2. Unprefixed numbers with recognized international prefixes
  if (digitsOnly.startsWith('92') && digitsOnly.length === 12) {
    return `+92 ${digitsOnly.slice(2, 5)} ${digitsOnly.slice(5)}`;
  }
  if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
    return `+91 ${digitsOnly.slice(2, 7)} ${digitsOnly.slice(7)}`;
  }
  if (digitsOnly.startsWith('1') && digitsOnly.length === 11) {
    return `+1 ${digitsOnly.slice(1, 4)} ${digitsOnly.slice(4, 7)} ${digitsOnly.slice(7)}`;
  }
  if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
    const c10 = digitsOnly.slice(1);
    return `+91 ${c10.slice(0, 5)} ${c10.slice(5)}`;
  }
  if (digitsOnly.length === 10) {
    return `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`;
  }
  if (digitsOnly.length > 10) {
    return `+${digitsOnly}`;
  }
  return rawPhone;
}

/**
 * Fast O(N) deduplication for call records by unique database _id or idempotencyKey.
 * Preserves all distinct back-to-back calls without time-window collapsing.
 */
export function deduplicateCalls(calls: any[]): any[] {
  if (!calls || calls.length === 0) return [];

  const seen = new Set<string>();
  const deduplicated: any[] = [];

  for (const call of calls) {
    const key = (call._id ? call._id.toString() : '') || call.idempotencyKey || `call_${Date.now()}_${Math.random()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(call);
    }
  }

  return deduplicated.sort((a, b) => {
    const timeA = new Date(a.startTime || a.createdAt || 0).getTime();
    const timeB = new Date(b.startTime || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Rebuilds the calls cache from MongoDB Atlas, enriches device metadata, and saves to Redis.
 */
export async function rebuildCallsCache(): Promise<any[]> {
  if (isRebuildingCalls) {
    const cached = await cacheGet<any[]>(CALLS_CACHE_KEY);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  }

  isRebuildingCalls = true;
  lastRebuildTimestamp = Date.now();

  try {
    const rawCalls = await withDbRetry(async () => {
      return await (CallModel as any)
        .find()
        .select('idempotencyKey phoneNumber phoneNumberMasked direction status startTime endTime durationSeconds simSlot isPrivate disposition channel agentName counselorEmail leadName recordingStatus s3Key audioUrl notes team deviceId createdAt updatedAt')
        .sort({ startTime: -1, createdAt: -1 })
        .limit(3000)
        .lean()
        .exec();
    });

    if (!rawCalls || rawCalls.length === 0) {
      isRebuildingCalls = false;
      return [];
    }

    // Enrich agent names from registered devices
    try {
      const registeredDevices = await (DeviceModel as any).find().select('deviceId agentName counselorEmail').lean().exec();
      if (registeredDevices && registeredDevices.length > 0) {
        const deviceAgentMap = new Map<string, string>();
        for (const dev of registeredDevices) {
          if (dev.deviceId && (dev.agentName || dev.counselorEmail)) {
            const name =
              dev.agentName && dev.agentName !== 'Counselor Agent' && dev.agentName !== 'Counselor'
                ? dev.agentName
                : dev.counselorEmail
                ? dev.counselorEmail
                    .split('@')[0]
                    .replace(/[._]/g, ' ')
                    .replace(/\b\w/g, (l: string) => l.toUpperCase())
                : null;
            if (name) {
              deviceAgentMap.set(dev.deviceId, name);
            }
          }
        }

        for (const call of rawCalls) {
          if (
            (!call.agentName || call.agentName === 'Counselor Agent' || call.agentName === 'Counselor') &&
            call.deviceId &&
            deviceAgentMap.has(call.deviceId)
          ) {
            call.agentName = deviceAgentMap.get(call.deviceId);
          }
        }
      }
    } catch (devErr) {
      console.warn('Cache service device enrichment notice:', devErr);
    }

    // Clean text/chat messages & format phone numbers
    const cleanCalls = rawCalls
      .filter((c: any) => {
        const fullStr = `${c.phoneNumber || ''} ${c.leadName || ''} ${c.disposition || ''}`.toLowerCase();
        return (
          !fullStr.includes('message') &&
          !fullStr.includes('messages') &&
          !fullStr.includes('unread') &&
          !fullStr.includes('mention') &&
          !fullStr.includes('group:')
        );
      })
      .map((c: any) => {
        const formatted = formatPhoneNumber(c.phoneNumber || c.phoneNumberMasked || '');
        if (formatted) {
          c.phoneNumber = formatted;
          c.phoneNumberMasked = formatted;
        }
        const isAns = (c.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
        if (!isAns) {
          c.durationSeconds = 0;
        }
        return c;
      });

    const deduplicated = deduplicateCalls(cleanCalls);

    // Save into Redis with 24-hour TTL
    if (deduplicated && deduplicated.length > 0) {
      await cacheSet(CALLS_CACHE_KEY, deduplicated, CALLS_CACHE_TTL);
    }

    return deduplicated;
  } catch (err) {
    console.error('Error rebuilding calls cache:', err);
    return [];
  } finally {
    isRebuildingCalls = false;
  }
}

/**
 * Fast-path retrieval of calls: Returns Redis data immediately (<50ms).
 * If cache is completely missing (cold start), builds cache synchronously once.
 */
export async function getCallsWithCache(): Promise<{ calls: any[]; cacheHit: boolean }> {
  const cached = await cacheGet<any[]>(CALLS_CACHE_KEY);
  if (cached && Array.isArray(cached) && cached.length > 0) {
    return { calls: cached, cacheHit: true };
  }

  // Cold start / Cache miss: Rebuild and store in Redis
  const calls = await rebuildCallsCache();
  return { calls, cacheHit: false };
}

/**
 * Triggers an asynchronous non-blocking background revalidation of the calls cache with rate-limiting.
 */
export function revalidateCallsCacheInBackground(force = false): void {
  const now = Date.now();
  if (!force && now - lastRebuildTimestamp < MIN_REBUILD_INTERVAL_MS) {
    // Throttled: Recent cache rebuild occurred within the throttle window
    return;
  }

  setTimeout(() => {
    rebuildCallsCache().catch((err) => {
      console.warn('Background cache revalidation error:', err);
    });
  }, 100);
}

/**
 * Updates the existing Redis cache with a new batch of calls from mobile sync (Non-destructive).
 * Operates purely in-memory and in Redis without triggering full MongoDB database scans.
 */
export async function updateCallsCacheWithNewBatch(newCalls: any[]): Promise<void> {
  if (!newCalls || newCalls.length === 0) return;

  try {
    const formattedBatch = newCalls.map((c: any) => {
      const formatted = formatPhoneNumber(c.phoneNumber || c.phoneNumberMasked || '');
      return {
        ...c,
        phoneNumber: formatted || c.phoneNumber,
        phoneNumberMasked: formatted || c.phoneNumberMasked,
      };
    });

    const existing = await cacheGet<any[]>(CALLS_CACHE_KEY);
    if (existing && Array.isArray(existing) && existing.length > 0) {
      const merged = deduplicateCalls([...formattedBatch, ...existing]).slice(0, 3000);
      await cacheSet(CALLS_CACHE_KEY, merged, CALLS_CACHE_TTL);
    } else {
      revalidateCallsCacheInBackground(true);
    }
  } catch (err) {
    console.warn('Error updating calls cache with new batch:', err);
  }
}

/**
 * Updates a specific call in Redis (e.g. audio upload, rating, bookmark) without deleting the cache.
 */
export async function patchCallInCache(callId: string, updates: Record<string, any>): Promise<void> {
  if (!callId) return;

  try {
    const existing = await cacheGet<any[]>(CALLS_CACHE_KEY);
    if (existing && Array.isArray(existing) && existing.length > 0) {
      let found = false;
      const updated = existing.map((c) => {
        const isMatch =
          (c._id && String(c._id) === String(callId)) ||
          (c.id && String(c.id) === String(callId)) ||
          (c.idempotencyKey && String(c.idempotencyKey) === String(callId));
        if (isMatch) {
          found = true;
          return { ...c, ...updates };
        }
        return c;
      });

      if (found) {
        await cacheSet(CALLS_CACHE_KEY, updated, CALLS_CACHE_TTL);
      }
    }
  } catch (err) {
    console.warn('Error patching call in cache:', err);
  }
}
