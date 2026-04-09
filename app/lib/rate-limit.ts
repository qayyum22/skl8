import { getRedisClient } from "@/app/lib/redis";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const redis = getRedisClient();

  if (!redis) {
    return { allowed: true, remaining: limit, resetInSeconds: windowSeconds };
  }

  await redis.connect().catch(() => undefined);

  const namespacedKey = `rate-limit:${key}`;
  const current = await redis.incr(namespacedKey);

  if (current === 1) {
    await redis.expire(namespacedKey, windowSeconds);
  }

  const ttl = await redis.ttl(namespacedKey);
  const remaining = Math.max(0, limit - current);

  return {
    allowed: current <= limit,
    remaining,
    resetInSeconds: ttl > 0 ? ttl : windowSeconds,
  };
}
