import { createServiceRoleClient } from '@/lib/supabase/service'

export async function logBillingEvent(params: {
  eventType: string
  tenantId?: string | null
  customerId?: string | null
  subscriptionId?: string | null
  invoiceId?: string | null
  status?: string | null
  metadata?: Record<string, unknown>
}) {
  try {
    const supabase = createServiceRoleClient()
    await supabase.from('billing_events').insert({
      event_type: params.eventType,
      tenant_id: params.tenantId || null,
      customer_id: params.customerId || null,
      subscription_id: params.subscriptionId || null,
      invoice_id: params.invoiceId || null,
      status: params.status || null,
      metadata: params.metadata || {},
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[billing-events] Failed to log billing event:', params.eventType, err)
  }
}
