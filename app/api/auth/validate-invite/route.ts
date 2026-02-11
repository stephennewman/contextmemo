import { NextResponse } from 'next/server'

// Invite codes — add or remove as needed
// Can also be set via INVITE_CODES env var (comma-separated)
const DEFAULT_CODES = [
  'AMAZING2026',
  'BRAVO2026',
  'CUSTOMERS2026',
  'DEALS2026',
  'FUNNEL2026',
]

function getValidCodes(): string[] {
  const envCodes = process.env.INVITE_CODES
  if (envCodes) {
    return envCodes.split(',').map(c => c.trim().toUpperCase()).filter(Boolean)
  }
  return DEFAULT_CODES
}

export async function POST(request: Request) {
  try {
    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      )
    }

    const validCodes = getValidCodes()
    const normalized = code.trim().toUpperCase()

    if (!validCodes.includes(normalized)) {
      return NextResponse.json(
        { error: 'Invalid invite code. Request one at /request-access' },
        { status: 400 }
      )
    }

    return NextResponse.json({ valid: true })
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
