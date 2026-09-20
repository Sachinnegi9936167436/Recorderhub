/**
 * High-Performance In-Memory Application Cache
 * 
 * Provides fast 0ms in-process caching for high-frequency queries and tokens.
 * Completely eliminates external Redis dependency, network latency, and quota costs.
 */

interface CacheEntry {
  value: any;
  expiresAt: number;
}

const memoryStore = new Map<string, CacheEntry>();

/**
 * Get cached item (0ms retrieval from process memory)
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (entry) {
    if (entry.expiresAt > now) {
      return entry.value as T;
    }
    memoryStore.delete(key);
  }
  return null;
}

/**
 * Set cached item with TTL in seconds (Default: 60s)
 */
export async function cacheSet(key: string, value: any, ttlSeconds: number = 60): Promise<boolean> {
  const now = Date.now();
  memoryStore.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
  return true;
}

/**
 * Delete one or more keys from the cache
 */
export async function cacheDel(...keys: string[]): Promise<boolean> {
  for (const k of keys) {
    memoryStore.delete(k);
  }
  return true;
}

/**
 * Clear all cached items in process
 */
export async function cacheClear(): Promise<boolean> {
  memoryStore.clear();
  return true;
}
