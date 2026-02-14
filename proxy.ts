import { type NextRequest, after } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { detectBot, resolveMemoPath, logBotCrawl } from '@/lib/bot-detection'
import { enrichIP } from '@/lib/ip-enrichment'

export async function proxy(request: NextRequest) {
  // Bot crawl detection — pure string matching (~0ms), DB write + IP enrichment runs after response
  const bot = detectBot(request.headers.get('user-agent'))
  if (bot) {
    const memoPath = resolveMemoPath(request)
    if (memoPath) {
      after(async () => {
        const lat = request.headers.get('x-vercel-ip-latitude')
        const lng = request.headers.get('x-vercel-ip-longitude')
        const rawIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')

        // IP enrichment — cached, so only calls IPinfo API on first encounter
        const ipData = await enrichIP(rawIp)

        await logBotCrawl({
          ...bot,
          ...memoPath,
          userAgent: request.headers.get('user-agent') || '',
          ipCountry: request.headers.get('x-vercel-ip-country') || null,
          ipCity: request.headers.get('x-vercel-ip-city') || null,
          ipRegion: request.headers.get('x-vercel-ip-country-region') || null,
          ipLatitude: lat ? parseFloat(lat) : null,
          ipLongitude: lng ? parseFloat(lng) : null,
          ipTimezone: request.headers.get('x-vercel-ip-timezone') || null,
          ipOrgName: ipData?.orgName || null,
          ipAsn: ipData?.asn || null,
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
