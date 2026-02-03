-- Prompt Intelligence table
-- Stores insights about trending prompts, competitor wins, and emerging opportunities

CREATE TABLE IF NOT EXISTS prompt_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Category of insight
  category TEXT NOT NULL CHECK (category IN ('trending', 'competitor_win', 'emerging', 'declining')),
  
  -- The prompt/query this insight is about
  prompt_text TEXT,
  
  -- Human-readable insight
  insight_title TEXT NOT NULL,
  insight_description TEXT NOT NULL,
  
  -- Competitor data
  competitors_winning TEXT[] DEFAULT '{}',
  
  -- Scoring
  opportunity_score INTEGER CHECK (opportunity_score >= 0 AND opportunity_score <= 100),
  
  -- Actionable suggestion
  action_suggestion TEXT,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  
  -- Status tracking
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'actioned', 'dismissed')),
  actioned_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prompt_intel_brand ON prompt_intelligence(brand_id);
CREATE INDEX IF NOT EXISTS idx_prompt_intel_category ON prompt_intelligence(category);
CREATE INDEX IF NOT EXISTS idx_prompt_intel_score ON prompt_intelligence(opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_intel_status ON prompt_intelligence(status);
CREATE INDEX IF NOT EXISTS idx_prompt_intel_created ON prompt_intelligence(created_at DESC);

-- View for top opportunities by brand
CREATE OR REPLACE VIEW prompt_intelligence_summary AS
SELECT 
  brand_id,
  COUNT(*) as total_insights,
  COUNT(*) FILTER (WHERE category = 'competitor_win') as competitor_wins,
  COUNT(*) FILTER (WHERE category = 'emerging') as emerging_patterns,
  COUNT(*) FILTER (WHERE category = 'trending') as trending,
  AVG(opportunity_score) as avg_opportunity_score,
  MAX(opportunity_score) as top_opportunity_score,
  COUNT(*) FILTER (WHERE status = 'new') as unreviewed,
  COUNT(*) FILTER (WHERE status = 'actioned') as actioned
FROM prompt_intelligence
GROUP BY brand_id;

-- Comment
COMMENT ON TABLE prompt_intelligence IS 'AI-generated insights about prompt trends, competitor wins, and content opportunities. Powers the Prompt Intelligence Feed.';
