-- Voice Insights: Verified human-sourced content for primary source citations
-- Created: February 4, 2026

-- Voice insights table - stores transcribed voice recordings with verification metadata
CREATE TABLE IF NOT EXISTS voice_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Content
  title TEXT NOT NULL,
  transcript TEXT NOT NULL,
  topic TEXT NOT NULL CHECK (topic IN (
    'market_position',      -- How the brand positions in the market
    'concept_definition',   -- Defining industry terms/concepts
    'product_insight',      -- Product-specific knowledge
    'competitive_advantage',-- What makes us different
    'customer_context',     -- Who we serve and why
    'industry_expertise',   -- Domain expertise
    'other'
  )),
  tags TEXT[] DEFAULT '{}',
  
  -- Audio storage (optional - can be text-only)
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  
  -- Verification metadata (the credibility stack)
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by_user_id UUID REFERENCES auth.users(id),
  recorded_by_name TEXT NOT NULL,
  recorded_by_title TEXT,
  recorded_by_email TEXT,
  recorded_by_linkedin_url TEXT,
  
  -- Location verification
  ip_address TEXT,
  geolocation JSONB,  -- { lat, lng, city, region, country, timezone }
  
  -- Usage tracking
  cited_in_memos UUID[] DEFAULT '{}',  -- memo IDs that reference this insight
  citation_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_voice_insights_brand_id ON voice_insights(brand_id);
CREATE INDEX IF NOT EXISTS idx_voice_insights_tenant_id ON voice_insights(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voice_insights_topic ON voice_insights(topic);
CREATE INDEX IF NOT EXISTS idx_voice_insights_status ON voice_insights(status);
CREATE INDEX IF NOT EXISTS idx_voice_insights_recorded_at ON voice_insights(recorded_at DESC);

-- RLS policies
ALTER TABLE voice_insights ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own tenant's insights
CREATE POLICY "Users can view own tenant voice insights"
  ON voice_insights FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE id = auth.uid()
    )
    OR
    tenant_id IN (
      SELECT tenant_id FROM brands WHERE id = voice_insights.brand_id
    )
  );

-- Allow users to insert insights for their brands
CREATE POLICY "Users can create voice insights for own brands"
  ON voice_insights FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT id FROM brands WHERE tenant_id = auth.uid()
    )
  );

-- Allow users to update their own insights
CREATE POLICY "Users can update own voice insights"
  ON voice_insights FOR UPDATE
  USING (
    recorded_by_user_id = auth.uid()
    OR
    tenant_id = auth.uid()
  );

-- Allow users to delete their own insights
CREATE POLICY "Users can delete own voice insights"
  ON voice_insights FOR DELETE
  USING (
    recorded_by_user_id = auth.uid()
    OR
    tenant_id = auth.uid()
  );

-- Function to update citation count
CREATE OR REPLACE FUNCTION update_voice_insight_citation_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE voice_insights
  SET citation_count = array_length(cited_in_memos, 1),
      updated_at = NOW()
  WHERE id = NEW.id OR id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update citation count
CREATE TRIGGER voice_insight_citation_count_trigger
  AFTER UPDATE OF cited_in_memos ON voice_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_insight_citation_count();

-- Comment for documentation
COMMENT ON TABLE voice_insights IS 'Verified human-sourced insights for primary source citations. Includes voice transcriptions with full verification metadata (timestamp, IP, geolocation, identity).';
COMMENT ON COLUMN voice_insights.geolocation IS 'JSON object with lat, lng, city, region, country, timezone';
COMMENT ON COLUMN voice_insights.cited_in_memos IS 'Array of memo IDs that cite this insight';
