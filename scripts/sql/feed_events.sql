-- Feed Events Table
-- Central table for the unified v2 feed system
-- Stores all workflow events that appear in the user's feed

-- Create enum types for type safety
DO $$ BEGIN
  CREATE TYPE feed_workflow AS ENUM (
    'core_discovery',
    'network_expansion', 
    'competitive_response',
    'verification',
    'greenspace',
    'system'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE feed_severity AS ENUM (
    'action_required',
    'success',
    'info',
    'warning'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create the feed_events table
CREATE TABLE IF NOT EXISTS feed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Event classification
  workflow feed_workflow NOT NULL,
  event_type TEXT NOT NULL, -- e.g., 'gap_identified', 'citation_verified', 'competitor_published'
  
  -- Display content
  title TEXT NOT NULL,
  description TEXT,
  severity feed_severity DEFAULT 'info',
  
  -- Action tracking
  action_available TEXT[], -- e.g., ['generate_memo', 'dismiss', 'expand_network']
  action_cost_credits INTEGER DEFAULT 0, -- cost if user takes primary action
  action_taken TEXT, -- which action was taken
  action_taken_at TIMESTAMPTZ,
  
  -- Related entities (nullable - depends on event type)
  related_query_id UUID REFERENCES queries(id) ON DELETE SET NULL,
  related_memo_id UUID REFERENCES memos(id) ON DELETE SET NULL,
  related_competitor_id UUID REFERENCES competitors(id) ON DELETE SET NULL,
  related_scan_id UUID, -- references scan_results but no FK (scan_results may not have stable PKs)
  
  -- Flexible metadata payload
  data JSONB DEFAULT '{}',
  
  -- User interaction state
  read BOOLEAN DEFAULT false,
  dismissed BOOLEAN DEFAULT false,
  pinned BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for feed queries
-- Primary feed query: get recent events for a tenant/brand
CREATE INDEX IF NOT EXISTS idx_feed_tenant_created ON feed_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_brand_created ON feed_events(brand_id, created_at DESC);

-- Unread items query
CREATE INDEX IF NOT EXISTS idx_feed_unread ON feed_events(tenant_id, read, created_at DESC) WHERE NOT read;

-- Filter by workflow
CREATE INDEX IF NOT EXISTS idx_feed_workflow ON feed_events(brand_id, workflow, created_at DESC);

-- Filter by severity (action required items)
CREATE INDEX IF NOT EXISTS idx_feed_action_required ON feed_events(brand_id, severity, created_at DESC) 
  WHERE severity = 'action_required';

-- For finding related events
CREATE INDEX IF NOT EXISTS idx_feed_related_query ON feed_events(related_query_id) WHERE related_query_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feed_related_memo ON feed_events(related_memo_id) WHERE related_memo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feed_related_competitor ON feed_events(related_competitor_id) WHERE related_competitor_id IS NOT NULL;

-- Enable RLS
ALTER TABLE feed_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own feed events
CREATE POLICY "Users can view own feed events" ON feed_events
  FOR SELECT
  USING (tenant_id = auth.uid());

-- Policy: Users can update their own feed events (mark read, dismiss, etc.)
CREATE POLICY "Users can update own feed events" ON feed_events
  FOR UPDATE
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- Policy: Service role has full access (for Inngest functions)
CREATE POLICY "Service role has full access to feed" ON feed_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feed_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feed_events_updated_at
  BEFORE UPDATE ON feed_events
  FOR EACH ROW
  EXECUTE FUNCTION update_feed_events_updated_at();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE feed_events;

-- Add comment for documentation
COMMENT ON TABLE feed_events IS 'Unified feed events for v2 UI - stores all workflow events with actions and metadata';
COMMENT ON COLUMN feed_events.workflow IS 'Which of the 5 workflows generated this event';
COMMENT ON COLUMN feed_events.event_type IS 'Specific event type within the workflow (e.g., gap_identified, citation_verified)';
COMMENT ON COLUMN feed_events.action_cost_credits IS 'How many credits the primary action costs (0 = free)';
COMMENT ON COLUMN feed_events.data IS 'Flexible JSON payload with event-specific data';
