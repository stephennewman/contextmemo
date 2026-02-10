import type { NextRequest } from 'next/server'

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

export function isAdminIP(ip: string): boolean {
  const adminIps = process.env.ADMIN_IP_WHITELIST?.split(',').map(s => s.trim()).filter(Boolean) || []
  if (adminIps.length === 0) {
    // If no whitelist is configured, allow all IPs (or implement a default deny)
    // For now, allow if no whitelist is set for flexibility.
    return true 
  }
  return adminIps.includes(ip)
}
