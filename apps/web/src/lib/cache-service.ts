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

/**
 * Normalizes phone numbers into "+91 XXXXX XXXXX"
 */
export function formatPhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  const digitsOnly = rawPhone.replace(/\D/g, '');
  if (digitsOnly.length >= 10) {
    const clean10 = digitsOnly.slice(-10);
    return `+91 ${clean10.slice(0, 5)} ${clean10.slice(5)}`;
  }
  return rawPhone;
}

/**
 * Fast O(N) deduplication for call records sharing the same phone & channel within 2 minutes.
 */
export function deduplicateCalls(calls: any[]): any[] {
  if (!calls || calls.length === 0) return [];

  const deduplicated: any[] = [];
  const clusterMap = new Map<string, any>();

  for (const call of calls) {
    const digits = (call.phoneNumber || call.phoneNumberMasked || '').replace(/\D/g, '').slice(-10);
    const channel = (call.channel || '').toUpperCase();
    const callTime = new Date(call.startTime || call.createdAt || Date.now()).getTime();

    // 2-minute time window bucket
    const timeBucket = Math.floor(callTime / 120000);
    const key = digits && digits.length >= 10 ? `${digits}_${channel}_${timeBucket}` : `call_${call._id || call.idempotencyKey}`;

    if (clusterMap.has(key)) {
      const existing = clusterMap.get(key);
      const existingDur = existing.durationSeconds || 0;
      const currentDur = call.durationSeconds || 0;

      if (currentDur > existingDur) {
        clusterMap.set(key, call);
      }
    } else {
      clusterMap.set(key, call);
    }
  }

  return Array.from(clusterMap.values()).sort((a, b) => {
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
  try {
    const rawCalls = await withDbRetry(async () => {
      return await (CallModel as any)
        .find()
        .sort({ startTime: -1, createdAt: -1 })
        .limit(5000)
        .lean()
        .exec();
    });

    if (!rawCalls || rawCalls.length === 0) {
      isRebuildingCalls = false;
      return [];
    }

    // Enrich agent names from registered devices
    try {
      const registeredDevices = await (DeviceModel as any).find().lean().exec();
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
 * Triggers an asynchronous non-blocking background revalidation of the calls cache.
 */
export function revalidateCallsCacheInBackground(): void {
  setTimeout(() => {
    rebuildCallsCache().catch((err) => {
      console.warn('Background cache revalidation error:', err);
    });
  }, 100);
}

/**
 * Updates the existing Redis cache with a new batch of calls from mobile sync (Non-destructive).
 */
export async function updateCallsCacheWithNewBatch(newCalls: any[]): Promise<void> {
  if (!newCalls || newCalls.length === 0) return;

  try {
    const existing = await cacheGet<any[]>(CALLS_CACHE_KEY);
    if (existing && Array.isArray(existing) && existing.length > 0) {
      const merged = deduplicateCalls([...newCalls, ...existing]).slice(0, 5000);
      await cacheSet(CALLS_CACHE_KEY, merged, CALLS_CACHE_TTL);
    } else {
      revalidateCallsCacheInBackground();
    }
  } catch (err) {
    console.warn('Error updating calls cache with new batch:', err);
    revalidateCallsCacheInBackground();
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
        if (c._id === callId || c.id === callId || c.idempotencyKey === callId) {
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
