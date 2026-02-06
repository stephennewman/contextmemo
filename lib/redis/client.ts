import { createClient, type RedisClientType } from 'redis'

let client: RedisClientType | null = null
let connecting: Promise<RedisClientType> | null = null

function getRedisUrl(): string | null {
  const url = process.env.REDIS_URL
  if (!url) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('REDIS_URL not set - Redis features disabled in development')
      return null
    }
    throw new Error('REDIS_URL is required in production')
  }
  return url
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  const url = getRedisUrl()
  if (!url) return null
  if (client) return client
  if (connecting) return connecting

  const newClient = createClient({ url })
  newClient.on('error', (err) => {
    console.error('Redis client error:', err)
  })

  connecting = newClient.connect().then(() => {
    client = newClient
    return newClient
  })

  return connecting
}

export async function redisEnabled(): Promise<boolean> {
  try {
    const redis = await getRedisClient()
    return !!redis
  } catch {
    return false
  }
}
