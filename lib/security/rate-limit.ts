import { getRedisClient } from '@/lib/redis/client'

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetMs: number
}

export type RateLimitOptions = {
  key: string
  windowMs: number
  max: number
}

export async function rateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const redis = await getRedisClient()
  if (!redis) {
    return { allowed: true, remaining: options.max, resetMs: options.windowMs }
  }

  const { key, windowMs, max } = options
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.pExpire(key, windowMs)
  }

  const ttl = await redis.pTTL(key)
  const remaining = Math.max(max - count, 0)

  return {
    allowed: count <= max,
    remaining,
    resetMs: ttl > 0 ? ttl : windowMs,
  }
}

export async function ensureIdempotency(key: string, ttlSeconds: number): Promise<boolean> {
  const redis = await getRedisClient()
  if (!redis) return true

  const result = await redis.set(key, '1', {
    NX: true,
    EX: ttlSeconds,
  })

  return result === 'OK'
}
