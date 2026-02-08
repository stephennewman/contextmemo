import { type NextRequest, after } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { detectBot, resolveMemoPath, logBotCrawl } from '@/lib/bot-detection'

export async function proxy(request: NextRequest) {
  // Bot crawl detection — pure string matching (~0ms), DB write runs after response
  const bot = detectBot(request.headers.get('user-agent'))
  if (bot) {
    const memoPath = resolveMemoPath(request)
    if (memoPath) {
      after(async () => {
        await logBotCrawl({
          ...bot,
          ...memoPath,
          userAgent: request.headers.get('user-agent') || '',
          ipCountry: request.headers.get('x-vercel-ip-country') || null,
        })
      })
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
