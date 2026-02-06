import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getClientIp } from '@/lib/security/ip'
import { rateLimit } from '@/lib/security/rate-limit'

const payloadSchema = z.object({
  action: z.enum(['login', 'signup']),
  email: z.string().email().optional(),
})

const LIMITS = {
  login: {
    windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.AUTH_RATE_LIMIT_MAX_LOGIN || 8),
  },
  signup: {
    windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.AUTH_RATE_LIMIT_MAX_SIGNUP || 5),
  },
} as const

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const json = await request.json().catch(() => null)
  const parsed = payloadSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { action, email } = parsed.data
  const { windowMs, max } = LIMITS[action]

  const ipResult = await rateLimit({
    key: `auth:${action}:ip:${ip}`,
    windowMs,
    max,
  })

  if (!ipResult.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  if (email) {
    const emailResult = await rateLimit({
      key: `auth:${action}:email:${email.toLowerCase()}`,
      windowMs,
      max,
    })

    if (!emailResult.allowed) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }
  }

  return NextResponse.json({ allowed: true })
}
