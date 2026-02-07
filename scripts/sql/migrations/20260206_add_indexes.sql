-- Performance indexes for critical queries

create index if not exists idx_brands_tenant_id on brands (tenant_id);
create index if not exists idx_brands_org_id on brands (organization_id);

create index if not exists idx_competitors_brand_id on competitors (brand_id);
create index if not exists idx_competitors_brand_active on competitors (brand_id, is_active);

create index if not exists idx_competitor_content_competitor_id on competitor_content (competitor_id);
create index if not exists idx_competitor_content_first_seen_at on competitor_content (first_seen_at);

create index if not exists idx_memos_brand_id on memos (brand_id);
create index if not exists idx_queries_brand_id on queries (brand_id);

create index if not exists idx_scan_results_brand_created_at on scan_results (brand_id, created_at);

create index if not exists idx_feed_events_tenant_created_at on feed_events (tenant_id, created_at desc);
create index if not exists idx_feed_events_tenant_unread on feed_events (tenant_id, read, dismissed);

create index if not exists idx_alerts_brand_created_at on alerts (brand_id, created_at desc);

create index if not exists idx_organization_members_user on organization_members (user_id);
create index if not exists idx_organization_members_org on organization_members (organization_id);

create index if not exists idx_tenants_stripe_customer_id on tenants (stripe_customer_id);
create index if not exists idx_tenants_email on tenants (email);
