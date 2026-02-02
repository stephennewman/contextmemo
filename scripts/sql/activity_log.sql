-- Activity Log table for unified activity feed
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Activity classification
  activity_type TEXT NOT NULL,
  category TEXT NOT NULL, -- 'scan', 'content', 'discovery', 'traffic', 'system'
  
  -- Display info
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- lucide icon name
  
  -- Links and metadata
  link_url TEXT, -- e.g., /brands/uuid/memos/uuid
  link_label TEXT, -- e.g., "View Memo"
  metadata JSONB DEFAULT '{}', -- flexible storage for activity-specific data
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_activity_log_brand_id ON activity_log(brand_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_id ON activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_category ON activity_log(category);
CREATE INDEX IF NOT EXISTS idx_activity_log_activity_type ON activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_brand_created ON activity_log(brand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_created ON activity_log(tenant_id, created_at DESC);

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role has full access to activity_log" ON activity_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy: Users can read their own activity
CREATE POLICY "Users can view their activity" ON activity_log
  FOR SELECT
  USING (tenant_id = auth.uid());

-- Activity types reference:
-- Scans:
--   scan_started, scan_completed, scan_failed
-- Content:
--   memo_generated, memo_published, memo_updated, context_extracted
-- Discovery:
--   competitor_discovered, query_generated, competitor_content_found
-- Traffic:
--   ai_traffic_detected
-- System:
--   daily_run_completed, search_console_synced, error

COMMENT ON TABLE activity_log IS 'Unified activity feed for tracking all product events';
COMMENT ON COLUMN activity_log.category IS 'High-level category: scan, content, discovery, traffic, system';
COMMENT ON COLUMN activity_log.activity_type IS 'Specific activity type for filtering';
COMMENT ON COLUMN activity_log.metadata IS 'Flexible JSON storage for activity-specific data';

-- Saved views table for user filter preferences
CREATE TABLE IF NOT EXISTS activity_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}', -- { categories: [], activity_types: [], brand_ids: [] }
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_saved_views_tenant ON activity_saved_views(tenant_id);

ALTER TABLE activity_saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their saved views" ON activity_saved_views
  FOR ALL
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());
