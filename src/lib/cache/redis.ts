import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

declare global {
  var redisClient: Redis | undefined;
}

function initRedis() {
  if (!REDIS_URL) return null;
  if (global.redisClient) return global.redisClient;
  
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null // Do not infinitely retry connection
  });
  
  if (process.env.NODE_ENV !== 'production') {
    global.redisClient = client;
  }
  return client;
}

const client = initRedis();

// Safe wrapper that won't crash if Redis is unavailable
export const redis = {
  get: async (key: string) => client ? client.get(key) : null,
  set: async (key: string, val: string, mode?: string, duration?: number) => {
    if (client && mode && duration) return client.set(key, val, mode as any, duration);
    if (client) return client.set(key, val);
  },
  incr: async (key: string) => client ? client.incr(key) : 1,
  expire: async (key: string, seconds: number) => client ? client.expire(key, seconds) : 1
};

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
