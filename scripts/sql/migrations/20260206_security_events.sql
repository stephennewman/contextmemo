create table if not exists security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  ip_address text,
  user_id uuid,
  path text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_security_events_created_at on security_events (created_at desc);
create index if not exists idx_security_events_event_type on security_events (event_type);
create index if not exists idx_security_events_user_id on security_events (user_id);
