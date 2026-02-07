create table if not exists billing_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  tenant_id uuid,
  customer_id text,
  subscription_id text,
  invoice_id text,
  status text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_billing_events_created_at on billing_events (created_at desc);
create index if not exists idx_billing_events_tenant_id on billing_events (tenant_id);
create index if not exists idx_billing_events_event_type on billing_events (event_type);
