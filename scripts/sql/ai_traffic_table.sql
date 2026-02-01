-- AI Traffic tracking table
-- Run this in Supabase SQL Editor to enable AI traffic attribution

CREATE TABLE IF NOT EXISTS ai_traffic (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  memo_id UUID REFERENCES memos(id) ON DELETE SET NULL,
  page_url TEXT NOT NULL,
  referrer TEXT,
  referrer_source TEXT NOT NULL,
  user_agent TEXT,
  country TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_traffic_brand_id ON ai_traffic(brand_id);
CREATE INDEX IF NOT EXISTS idx_ai_traffic_timestamp ON ai_traffic(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_traffic_referrer_source ON ai_traffic(referrer_source);
CREATE INDEX IF NOT EXISTS idx_ai_traffic_brand_timestamp ON ai_traffic(brand_id, timestamp DESC);

-- Enable RLS
ALTER TABLE ai_traffic ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role has full access to ai_traffic" ON ai_traffic
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy: Users can read their own brand's traffic
CREATE POLICY "Users can view their brand traffic" ON ai_traffic
  FOR SELECT
  USING (
    brand_id IN (
      SELECT b.id FROM brands b
      JOIN tenants t ON b.tenant_id = t.id
      WHERE t.id = auth.uid()
    )
  );

-- Add comment for documentation
COMMENT ON TABLE ai_traffic IS 'Tracks visits to brand content from AI platforms like ChatGPT, Perplexity, Claude, etc.';
COMMENT ON COLUMN ai_traffic.referrer_source IS 'Detected AI source: chatgpt, perplexity, claude, gemini, copilot, meta_ai, poe, you, phind, direct, unknown_ai, organic, direct_nav';
