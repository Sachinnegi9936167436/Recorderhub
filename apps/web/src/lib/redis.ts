import { Redis } from '@upstash/redis';

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redisInstance) return redisInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  try {
    redisInstance = new Redis({
      url: url.trim(),
      token: token.trim(),
    });
    return redisInstance;
  } catch (err) {
    console.warn('Failed to initialize Upstash Redis client:', err);
    return null;
  }
}

/**
 * Safe Cache Get helper with graceful fallback
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient();
    if (!redis) return null;
    return await redis.get<T>(key);
  } catch (err) {
    console.warn(`Redis get failed for key "${key}":`, err);
    return null;
  }
}

/**
 * Safe Cache Set helper with TTL in seconds
 */
export async function cacheSet(key: string, value: any, ttlSeconds: number = 60): Promise<boolean> {
  try {
    const redis = getRedisClient();
    if (!redis) return false;
    await redis.set(key, value, { ex: ttlSeconds });
    return true;
  } catch (err) {
    console.warn(`Redis set failed for key "${key}":`, err);
    return false;
  }
}

/**
 * Safe Cache Delete helper
 */
export async function cacheDel(...keys: string[]): Promise<boolean> {
  try {
    const redis = getRedisClient();
    if (!redis || keys.length === 0) return false;
    await redis.del(...keys);
    return true;
  } catch (err) {
    console.warn(`Redis del failed for keys "${keys.join(', ')}":`, err);
    return false;
  }
}
