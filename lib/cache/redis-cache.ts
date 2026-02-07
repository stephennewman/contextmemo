import { getRedisClient } from '@/lib/redis/client'

export async function getCacheValue<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient()
  if (!redis) return null

  const value = await redis.get(key)
  if (!value) return null

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export async function setCacheValue<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const redis = await getRedisClient()
  if (!redis) return

  await redis.set(key, JSON.stringify(value), {
    EX: ttlSeconds,
  })
}
