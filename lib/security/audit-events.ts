import { createServiceRoleClient } from '@/lib/supabase/service'
import type { NextRequest } from 'next/server'

const supabase = createServiceRoleClient()

export interface AuditEvent {
  action: string
  userId: string
  tenantId?: string // Can be inferred from userId or passed directly
  resourceId?: string
  resourceType?: string
  changes?: Record<string, { from: unknown; to: unknown }>
  timestamp: string
  ipAddress?: string
  metadata?: Record<string, unknown>
}

export async function logAuditEvent(event: Omit<AuditEvent, 'timestamp'>, request?: NextRequest) {
  try {
    const ipAddress = request 
      ? (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown')
      : undefined

    await supabase.from('audit_log').insert({
      action: event.action,
      user_id: event.userId,
      tenant_id: event.tenantId || event.userId, // Default to userId if tenantId not provided
      resource_id: event.resourceId,
      resource_type: event.resourceType,
      changes: event.changes,
      timestamp: new Date().toISOString(),
      ip_address: ipAddress,
      metadata: event.metadata,
    })
  } catch (e) {
    console.error('Failed to log audit event:', e)
    // Avoid throwing from logging function
  }
}
