import { createServiceRoleClient } from '@/lib/supabase/service'

export type SecurityEventType =
  | 'csrf_blocked'
  | 'rate_limited'
  | 'session_expired'
  | 'webhook_invalid'
  | 'unauthorized'

export async function logSecurityEvent(params: {
  type: SecurityEventType
  ip?: string | null
  userId?: string | null
  path?: string
  details?: Record<string, unknown>
}) {
  try {
    const supabase = createServiceRoleClient()
    await supabase.from('security_events').insert({
      event_type: params.type,
      ip_address: params.ip || null,
      user_id: params.userId || null,
      path: params.path || null,
      details: params.details || {},
      created_at: new Date().toISOString(),
    })
  } catch {
    // Avoid throwing from logging
  }
}
