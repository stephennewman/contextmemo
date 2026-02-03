-- Competitor RSS/Blog Feed Tracking
-- Stores discovered and manually-added feeds for efficient monitoring

CREATE TABLE IF NOT EXISTS competitor_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  
  -- Feed identification
  feed_url TEXT NOT NULL,
  feed_type TEXT NOT NULL DEFAULT 'rss', -- 'rss', 'atom', 'blog_index', 'sitemap'
  title TEXT, -- Feed title from RSS
  description TEXT, -- Feed description
  
  -- Feed state tracking
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_manually_added BOOLEAN NOT NULL DEFAULT false, -- User added vs auto-discovered
  
  -- Incremental sync support
  last_checked_at TIMESTAMPTZ,
  last_successful_at TIMESTAMPTZ, -- Last time we got new content
  last_etag TEXT, -- HTTP ETag for conditional requests
  last_modified TEXT, -- HTTP Last-Modified header
  last_build_date TIMESTAMPTZ, -- RSS lastBuildDate
  
  -- Stats
  total_items_found INTEGER DEFAULT 0,
  check_failures INTEGER DEFAULT 0, -- Count of consecutive failures
  
  -- Error tracking
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  
  -- Timestamps
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique feed per competitor
  UNIQUE(competitor_id, feed_url)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_competitor_feeds_competitor ON competitor_feeds(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_feeds_active ON competitor_feeds(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_competitor_feeds_last_checked ON competitor_feeds(last_checked_at);

-- Add published_at to competitor_content for better date tracking
ALTER TABLE competitor_content ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE competitor_content ADD COLUMN IF NOT EXISTS source_feed_id UUID REFERENCES competitor_feeds(id);
ALTER TABLE competitor_content ADD COLUMN IF NOT EXISTS author TEXT;
ALTER TABLE competitor_content ADD COLUMN IF NOT EXISTS word_count INTEGER;
ALTER TABLE competitor_content ADD COLUMN IF NOT EXISTS full_content TEXT; -- Store full content for better analysis

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_competitor_content_published ON competitor_content(published_at);
CREATE INDEX IF NOT EXISTS idx_competitor_content_source_feed ON competitor_content(source_feed_id);

-- Update trigger for competitor_feeds
CREATE OR REPLACE FUNCTION update_competitor_feeds_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS competitor_feeds_updated ON competitor_feeds;
CREATE TRIGGER competitor_feeds_updated
  BEFORE UPDATE ON competitor_feeds
  FOR EACH ROW
  EXECUTE FUNCTION update_competitor_feeds_timestamp();

-- RLS policies for competitor_feeds (inherit from competitors)
ALTER TABLE competitor_feeds ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view feeds for their brand's competitors
CREATE POLICY competitor_feeds_select ON competitor_feeds
  FOR SELECT
  USING (
    competitor_id IN (
      SELECT c.id FROM competitors c
      JOIN brands b ON c.brand_id = b.id
      JOIN tenants t ON b.tenant_id = t.id
      WHERE t.id = auth.uid()
    )
  );

-- Policy: Users can manage feeds for their brand's competitors  
CREATE POLICY competitor_feeds_all ON competitor_feeds
  FOR ALL
  USING (
    competitor_id IN (
      SELECT c.id FROM competitors c
      JOIN brands b ON c.brand_id = b.id
      JOIN tenants t ON b.tenant_id = t.id
      WHERE t.id = auth.uid()
    )
  );
