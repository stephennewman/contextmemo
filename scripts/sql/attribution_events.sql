-- Attribution Events table
-- Tracks the full funnel from AI traffic → contact → deal → closed won
-- Connects AI-generated content to actual revenue

CREATE TABLE IF NOT EXISTS attribution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Event type in the funnel
  event_type TEXT NOT NULL CHECK (event_type IN ('traffic', 'contact', 'deal', 'closed_won')),
  
  -- AI source that drove this event
  ai_source TEXT, -- chatgpt, perplexity, claude, etc.
  
  -- Content that was cited/viewed
  memo_id UUID REFERENCES memos(id) ON DELETE SET NULL,
  gap_id UUID REFERENCES content_gaps(id) ON DELETE SET NULL,
  
  -- HubSpot IDs for CRM linking
  hubspot_contact_id TEXT,
  hubspot_deal_id TEXT,
  
  -- Revenue tracking
  deal_value DECIMAL(12, 2),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_attribution_brand ON attribution_events(brand_id);
CREATE INDEX IF NOT EXISTS idx_attribution_type ON attribution_events(event_type);
CREATE INDEX IF NOT EXISTS idx_attribution_source ON attribution_events(ai_source);
CREATE INDEX IF NOT EXISTS idx_attribution_memo ON attribution_events(memo_id);
CREATE INDEX IF NOT EXISTS idx_attribution_contact ON attribution_events(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS idx_attribution_deal ON attribution_events(hubspot_deal_id);
CREATE INDEX IF NOT EXISTS idx_attribution_created ON attribution_events(created_at);

-- Unique constraint to prevent duplicate deal tracking
CREATE UNIQUE INDEX IF NOT EXISTS idx_attribution_unique_deal 
  ON attribution_events(hubspot_deal_id) 
  WHERE hubspot_deal_id IS NOT NULL;

-- View for attribution summary by brand
CREATE OR REPLACE VIEW attribution_summary AS
SELECT 
  brand_id,
  COUNT(*) FILTER (WHERE event_type = 'traffic') as total_traffic,
  COUNT(*) FILTER (WHERE event_type = 'contact') as total_contacts,
  COUNT(*) FILTER (WHERE event_type = 'deal') as total_deals,
  COUNT(*) FILTER (WHERE event_type = 'closed_won') as closed_won_deals,
  COALESCE(SUM(deal_value) FILTER (WHERE event_type = 'deal'), 0) as pipeline_value,
  COALESCE(SUM(deal_value) FILTER (WHERE event_type = 'closed_won'), 0) as closed_revenue,
  CASE 
    WHEN COUNT(*) FILTER (WHERE event_type = 'contact') > 0 
    THEN ROUND(COUNT(*) FILTER (WHERE event_type = 'closed_won')::numeric / 
         COUNT(*) FILTER (WHERE event_type = 'contact') * 100, 1)
    ELSE 0 
  END as conversion_rate
FROM attribution_events
GROUP BY brand_id;

-- View for attribution by AI source
CREATE OR REPLACE VIEW attribution_by_source AS
SELECT 
  brand_id,
  ai_source,
  COUNT(*) FILTER (WHERE event_type = 'contact') as contacts,
  COUNT(*) FILTER (WHERE event_type = 'closed_won') as closed_deals,
  COALESCE(SUM(deal_value) FILTER (WHERE event_type = 'closed_won'), 0) as revenue
FROM attribution_events
WHERE ai_source IS NOT NULL
GROUP BY brand_id, ai_source
ORDER BY revenue DESC;

-- View for attribution by content (memo)
CREATE OR REPLACE VIEW attribution_by_content AS
SELECT 
  ae.brand_id,
  ae.memo_id,
  m.title as memo_title,
  m.memo_type,
  COUNT(*) FILTER (WHERE ae.event_type = 'contact') as contacts,
  COUNT(*) FILTER (WHERE ae.event_type = 'closed_won') as closed_deals,
  COALESCE(SUM(ae.deal_value) FILTER (WHERE ae.event_type = 'closed_won'), 0) as revenue
FROM attribution_events ae
LEFT JOIN memos m ON ae.memo_id = m.id
WHERE ae.memo_id IS NOT NULL
GROUP BY ae.brand_id, ae.memo_id, m.title, m.memo_type
ORDER BY revenue DESC;

-- Comment
COMMENT ON TABLE attribution_events IS 'Tracks attribution from AI traffic through to closed revenue. Connects AI citations to actual business outcomes via HubSpot CRM.';
