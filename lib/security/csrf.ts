import { NextRequest } from 'next/server'
import { nanoid } from 'nanoid'
import { getIronSession } from 'iron-session'
import { SessionData, sessionOptions } from '@/lib/config/iron-session'

const CSRF_TOKEN_KEY = 'x-csrf-token'
const CSRF_SESSION_KEY = 'csrf_token'

export async function createCSRFToken(request: NextRequest): Promise<string> {
  const session = await getIronSession<SessionData>(request, new Response(), sessionOptions)
  let csrfToken = session[CSRF_SESSION_KEY]

  if (!csrfToken) {
    csrfToken = nanoid(32)
    session[CSRF_SESSION_KEY] = csrfToken
    await session.save()
  }
  return csrfToken
}

export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  const session = await getIronSession<SessionData>(request, new Response(), sessionOptions)
  const csrfTokenFromHeader = request.headers.get(CSRF_TOKEN_KEY)
  const csrfTokenFromSession = session[CSRF_SESSION_KEY]

  if (!csrfTokenFromHeader || !csrfTokenFromSession || csrfTokenFromHeader !== csrfTokenFromSession) {
    return false
  }

  // Once used, invalidate the token to prevent replay attacks (optional but good practice)
  session[CSRF_SESSION_KEY] = undefined
  await session.save()
  
  return true
}

export function getCSRFHeaderName(): string {
  return CSRF_TOKEN_KEY
}
