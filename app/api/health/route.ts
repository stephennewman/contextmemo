import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Health Check Endpoint
 * 
 * Checks critical service dependencies:
 * - Supabase (Postgres DB)
 * - Redis
 * - Environment configuration
 * 
 * Used by external uptime monitors (BetterStack, UptimeRobot, etc.)
 * and the internal Inngest uptime-check function.
 * 
 * Returns 200 if all services healthy, 503 if any are degraded.
 */

interface ServiceCheck {
  status: 'ok' | 'error'
  latencyMs?: number
  error?: string
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'down'
  timestamp: string
  version: string
  services: {
    supabase: ServiceCheck
    redis: ServiceCheck
  }
  uptime: number
}

const startTime = Date.now()

async function checkSupabase(): Promise<ServiceCheck> {
  const start = Date.now()
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    // Simple query to verify DB connectivity
    const { error } = await supabase.from('brands').select('id').limit(1)
    if (error) throw error
    return { status: 'ok', latencyMs: Date.now() - start }
  } catch (err) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

async function checkRedis(): Promise<ServiceCheck> {
  const start = Date.now()
  try {
    if (!process.env.REDIS_URL) {
      return { status: 'ok', latencyMs: 0 } // Redis is optional
    }
    const { createClient: createRedisClient } = await import('redis')
    const redis = createRedisClient({ url: process.env.REDIS_URL })
    await redis.connect()
    await redis.ping()
    await redis.disconnect()
    return { status: 'ok', latencyMs: Date.now() - start }
  } catch (err) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

export async function GET() {
  const [supabase, redis] = await Promise.all([
    checkSupabase(),
    checkRedis(),
  ])

  const services = { supabase, redis }
  const allOk = Object.values(services).every((s) => s.status === 'ok')
  const allDown = Object.values(services).every((s) => s.status === 'error')

  const health: HealthResponse = {
    status: allDown ? 'down' : allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '0.21.0',
    services,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  }

  return NextResponse.json(health, {
    status: allOk ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
