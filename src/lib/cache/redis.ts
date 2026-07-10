import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/0';

// Global instances to prevent creating multiple connections in dev
declare global {
  var redisClient: Redis | undefined;
}

export const redis = global.redisClient || new Redis(REDIS_URL);

if (process.env.NODE_ENV !== 'production') {
  global.redisClient = redis;
}

export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      console.log(`[Cache Hit] ${key}`);
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    console.warn(`[Redis Error] Failed to get cache for ${key}:`, err);
  }

  console.log(`[Cache Miss] ${key}`);
  const data = await fetcher();

  try {
    if (data !== undefined && data !== null) {
      await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    }
  } catch (err) {
    console.warn(`[Redis Error] Failed to set cache for ${key}:`, err);
  }

  return data;
}
